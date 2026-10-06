"""
Tests for the AI Metadata Extraction pipeline (Phase 6).

These mock the Gemini call itself (`_call_gemini`) rather than hitting the
real API - deliberately: this sandbox's network egress doesn't allow
generativelanguage.googleapis.com, so a real end-to-end test isn't possible
here. What IS fully real and tested: JSON parsing, field validation, the
retry loop, database writes, and status transitions - i.e. everything this
codebase is actually responsible for. The Gemini call itself is the one
external boundary being stubbed.

Uses only the standard library (unittest) - no pytest dependency added just
for this. Run with:  python -m tests.test_ai_service   (from backend/)
"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_ai_service.db")

from app.core.config import settings  # noqa: E402
from app.db.database import Base, SessionLocal, engine  # noqa: E402
from app.models.document import Document  # noqa: E402
from app.services import ai_service  # noqa: E402


VALID_RESPONSE = """{
"title": "Land Ownership Certificate",
"summary": "This document certifies land ownership for the named individual in Kopargaon taluka.",
"department": "Revenue",
"category": "Land Record",
"keywords": ["land", "ownership", "certificate", "revenue", "Kopargaon"],
"confidence": 92
}"""

FENCED_RESPONSE = f"```json\n{VALID_RESPONSE}\n```"

MISSING_KEY_RESPONSE = '{"title": "X", "summary": "Y"}'  # missing department/category/keywords/confidence

NOT_JSON_RESPONSE = "Sure! Here is the analysis: title is Land Record..."


class AIServiceTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        settings.GEMINI_API_KEY = "test-key-for-mocked-tests"
        self.db = SessionLocal()
        self.document = Document(
            title="Test Doc",
            department="Revenue",
            original_filename="test.png",
            filename="test-stored.png",
            filepath="uploads/test-stored.png",
            filesize=100,
            filetype="png",
            uploaded_by="officer",
            status="Pending",
            ocr_text="Land Ownership Certificate for Parth Pawar, Kopargaon Revenue Department",
        )
        self.db.add(self.document)
        self.db.commit()
        self.db.refresh(self.document)

    def tearDown(self):
        self.db.query(Document).delete()
        self.db.commit()
        self.db.close()

    def test_parses_valid_json_response(self):
        with patch.object(ai_service, "_call_gemini", return_value=VALID_RESPONSE):
            ai_service.process_document_ai(self.document.id)

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertTrue(updated.ai_processed)
        self.assertIsNone(updated.ai_error)
        self.assertEqual(updated.ai_title, "Land Ownership Certificate")
        self.assertEqual(updated.ai_department, "Revenue")
        self.assertEqual(updated.ai_category, "Land Record")
        self.assertIsInstance(updated.ai_keywords, list)
        self.assertEqual(len(updated.ai_keywords), 5)
        self.assertEqual(updated.ai_confidence, 92.0)
        print("PASS: test_parses_valid_json_response")

    def test_strips_markdown_fence(self):
        with patch.object(ai_service, "_call_gemini", return_value=FENCED_RESPONSE):
            ai_service.process_document_ai(self.document.id)

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertTrue(updated.ai_processed)
        self.assertEqual(updated.ai_title, "Land Ownership Certificate")
        print("PASS: test_strips_markdown_fence")

    def test_rejects_response_missing_required_keys(self):
        with patch.object(ai_service, "_call_gemini", return_value=MISSING_KEY_RESPONSE):
            ai_service.process_document_ai(self.document.id)

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertFalse(updated.ai_processed)
        self.assertIsNotNone(updated.ai_error)
        self.assertIn("missing required keys", updated.ai_error)
        print("PASS: test_rejects_response_missing_required_keys")

    def test_rejects_non_json_response(self):
        with patch.object(ai_service, "_call_gemini", return_value=NOT_JSON_RESPONSE):
            ai_service.process_document_ai(self.document.id)

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertFalse(updated.ai_processed)
        self.assertIn("not valid JSON", updated.ai_error)
        print("PASS: test_rejects_non_json_response")

    def test_retries_then_succeeds(self):
        call_count = {"n": 0}

        def flaky_call(_ocr_text, _output_language=None):
            call_count["n"] += 1
            if call_count["n"] < 3:
                raise ConnectionError("simulated transient network failure")
            return VALID_RESPONSE

        with patch.object(ai_service, "_call_gemini", side_effect=flaky_call):
            with patch.object(ai_service.time, "sleep"):  # skip real backoff delay in tests
                ai_service.process_document_ai(self.document.id)

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertEqual(call_count["n"], 3)
        self.assertTrue(updated.ai_processed)
        self.assertEqual(updated.ai_title, "Land Ownership Certificate")
        print("PASS: test_retries_then_succeeds (3 attempts, succeeded on the 3rd)")

    def test_exhausts_retries_and_records_error(self):
        with patch.object(ai_service, "_call_gemini", side_effect=ConnectionError("network down")):
            with patch.object(ai_service.time, "sleep"):
                ai_service.process_document_ai(self.document.id)

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertFalse(updated.ai_processed)
        self.assertIn("network down", updated.ai_error)
        print("PASS: test_exhausts_retries_and_records_error")

    def test_missing_api_key_fails_immediately_without_retry(self):
        settings.GEMINI_API_KEY = ""
        call_count = {"n": 0}

        def counting_call(_ocr_text):
            call_count["n"] += 1
            return ai_service._call_gemini(_ocr_text)  # real function - should raise before any "call"

        with patch.object(ai_service.time, "sleep") as mock_sleep:
            ai_service.process_document_ai(self.document.id)
            mock_sleep.assert_not_called()  # config errors must not trigger backoff/retry

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertFalse(updated.ai_processed)
        self.assertIn("GEMINI_API_KEY", updated.ai_error)
        settings.GEMINI_API_KEY = "test-key-for-mocked-tests"
        print("PASS: test_missing_api_key_fails_immediately_without_retry")

    def _run_with_gemini_error(self, error):
        """Drive the REAL _call_gemini with the SDK client raising `error`."""
        client = type("Client", (), {})()
        client.models = type("Models", (), {"generate_content": lambda *_a, **_k: (_ for _ in ()).throw(error)})()
        with patch("google.genai.Client", return_value=client):
            with patch.object(ai_service.time, "sleep") as mock_sleep:
                ai_service.process_document_ai(self.document.id)
                mock_sleep.assert_not_called()  # permanent errors must not be retried
        self.db.expire_all()
        return self.db.get(Document, self.document.id)

    def test_model_not_found_is_explained_in_plain_words(self):
        updated = self._run_with_gemini_error(
            RuntimeError("404 NOT_FOUND. This model is no longer available to new users.")
        )
        self.assertFalse(updated.ai_processed)
        self.assertIn(f"'{settings.GEMINI_MODEL}' is not available", updated.ai_error)
        self.assertIn("GEMINI_MODEL", updated.ai_error)
        print("PASS: test_model_not_found_is_explained_in_plain_words")

    def test_bad_api_key_is_explained_in_plain_words(self):
        updated = self._run_with_gemini_error(RuntimeError("400 INVALID_ARGUMENT. API key not valid."))
        self.assertIn("rejected the API key", updated.ai_error)
        self.assertIn("GEMINI_API_KEY", updated.ai_error)
        print("PASS: test_bad_api_key_is_explained_in_plain_words")

    def test_quota_error_is_explained_in_plain_words(self):
        updated = self._run_with_gemini_error(RuntimeError("429 RESOURCE_EXHAUSTED. Quota exceeded."))
        self.assertIn("quota or rate limit", updated.ai_error)
        print("PASS: test_quota_error_is_explained_in_plain_words")

    def test_api_key_never_reaches_ai_error(self):
        with patch.object(ai_service.time, "sleep"):
            updated = self._run_with_gemini_error_retrying(
                RuntimeError(f"upstream said hello to {settings.GEMINI_API_KEY}")
            )
        self.assertNotIn(settings.GEMINI_API_KEY, updated.ai_error)
        self.assertIn("***", updated.ai_error)
        print("PASS: test_api_key_never_reaches_ai_error")

    def _run_with_gemini_error_retrying(self, error):
        client = type("Client", (), {})()
        client.models = type("Models", (), {"generate_content": lambda *_a, **_k: (_ for _ in ()).throw(error)})()
        with patch("google.genai.Client", return_value=client):
            ai_service.process_document_ai(self.document.id)
        self.db.expire_all()
        return self.db.get(Document, self.document.id)

    def test_confidence_out_of_range_is_clamped(self):
        response = VALID_RESPONSE.replace('"confidence": 92', '"confidence": 150')
        with patch.object(ai_service, "_call_gemini", return_value=response):
            ai_service.process_document_ai(self.document.id)

        self.db.expire_all()
        updated = self.db.get(Document, self.document.id)
        self.assertEqual(updated.ai_confidence, 100.0)
        print("PASS: test_confidence_out_of_range_is_clamped")


if __name__ == "__main__":
    unittest.main(verbosity=2)
