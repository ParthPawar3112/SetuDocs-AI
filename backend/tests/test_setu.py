"""
Tests for the SetuDocs AI layer: document-type detection, Deadline Guard,
Scheme Matcher, Impact Dashboard, and the pipeline hook in ai_service.

Like tests/test_ai_service.py these use only the standard library and mock the
single external boundary (the Gemini call). Run from backend/ with:

    python -m unittest tests.test_setu -v
"""
import os
import sys
import unittest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_setu.db")

from app.core.config import settings  # noqa: E402
from app.db.database import Base, SessionLocal, engine  # noqa: E402
from app.db.migrate import ensure_deadline_edit_column  # noqa: E402
from app.models.audit_log import AuditLog  # noqa: E402
from app.models.document import Document  # noqa: E402
from app.models import verification  # noqa: F401, E402 - registers the verification tables
from app.models.user import User  # noqa: E402
from app.routers import deadlines as deadlines_router  # noqa: E402
from app.schemas.setu import DeadlineCreate, DeadlineUpdate  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from app.models.setu import BusinessProfile, Deadline, DocumentInsight, TimingTrial  # noqa: E402
from app.services import ai_service, impact_service, scheme_service, setu_pipeline  # noqa: E402
from app.services.deadline_service import (  # noqa: E402
    extract_dates_from_text,
    merge_candidates,
    parse_ai_dates,
    sync_document_deadlines,
    urgency_for,
)
from app.services.doc_types import detect_document_types  # noqa: E402

TODAY = date(2026, 10, 3)


class DocTypeTests(unittest.TestCase):
    def test_udyam_certificate(self):
        self.assertIn("udyam", detect_document_types("UDYAM REGISTRATION CERTIFICATE\nMINISTRY OF MICRO, SMALL & MEDIUM ENTERPRISES"))

    def test_gst_certificate_but_not_an_invoice(self):
        self.assertIn("gst", detect_document_types("Form GST REG-06 Registration Certificate GSTIN 27ABCDE1234F1Z5"))
        self.assertNotIn("gst", detect_document_types("TAX INVOICE GSTIN 27ABCDE1234F1Z5 GST @ 18%"))

    def test_aadhaar_needs_more_than_the_word(self):
        self.assertIn("aadhaar", detect_document_types("Government of India\nUnique Identification Authority of India\nAadhaar 1234 5678 9012"))
        self.assertNotIn("aadhaar", detect_document_types("Savings passbook. Aadhaar linked: yes. IFSC SBIN0000001"))

    def test_itr_is_not_a_pan_card(self):
        found = detect_document_types("INCOME TAX DEPARTMENT ITR-V Acknowledgement Number Assessment Year 2025-26")
        self.assertIn("itr", found)
        self.assertNotIn("pan", found)

    def test_marathi_documents(self):
        self.assertIn("land_712", detect_document_types("७/१२ सातबारा उतारा गट क्रमांक ४५"))
        self.assertIn("shop_act", detect_document_types("दुकाने व आस्थापना अधिनियम नोंदणी प्रमाणपत्र"))
        self.assertIn("ration_card", detect_document_types("शिधापत्रिका"))

    def test_uses_ai_title_and_keywords_too(self):
        self.assertIn("udyam", detect_document_types("", title="Udyam Registration Certificate"))

    def test_empty_text_gives_nothing(self):
        self.assertEqual(detect_document_types(None), [])
        self.assertEqual(detect_document_types("   "), [])


class DateExtractionTests(unittest.TestCase):
    def kinds(self, text):
        return [(r["kind"], r["due_date"].isoformat()) for r in extract_dates_from_text(text, TODAY)]

    def test_validity_ignores_issue_date(self):
        self.assertEqual(self.kinds("Issued on 01/04/2024\nValid till 31/03/2027"), [("expiry", "2027-03-31")])
        self.assertEqual(self.kinds("Date of issue: 01/04/2024 Valid till: 31/03/2027"), [("expiry", "2027-03-31")])

    def test_validity_range_keeps_only_the_end_date(self):
        for text in (
            "Valid from 01/01/2026 to 31/12/2027",
            "Validity: 01/01/2026 - 31/12/2027",
            "Insurance period: 01/01/2026 to 31/12/2027",
        ):
            self.assertEqual(self.kinds(text), [("expiry", "2027-12-31")], text)
        # A start date on its own is not an obligation.
        self.assertEqual(self.kinds("Valid from 01/01/2026"), [])

    def test_marathi_trailing_cue_and_digits(self):
        self.assertEqual(self.kinds("परवाना ३१/१२/२०२६ पर्यंत वैध आहे"), [("expiry", "2026-12-31")])
        self.assertEqual(self.kinds("वैधता ३१ डिसेंबर २०२६"), [("expiry", "2026-12-31")])

    def test_issue_date_on_previous_line_does_not_borrow_next_lines_cue(self):
        text = "दिनांक १५/०४/२०२४\n३१/१२/२०२६ पर्यंत वैध"
        self.assertEqual(self.kinds(text), [("expiry", "2026-12-31")])

    def test_month_names_and_us_style(self):
        self.assertEqual(self.kinds("Premium due date: 15 November 2026"), [("due", "2026-11-15")])
        self.assertEqual(self.kinds("Licence expires on March 31, 2027"), [("expiry", "2027-03-31")])
        self.assertEqual(self.kinds("Renew before 30-Nov-2026"), [("renewal", "2026-11-30")])
        self.assertEqual(self.kinds("Last date for renewal: 30 November 2026"), [("renewal", "2026-11-30")])
        # a nearer "valid till" cue still beats an earlier mention of renewal
        self.assertEqual(self.kinds("Renewal fee Rs 500. Valid till 31/03/2027"), [("expiry", "2027-03-31")])

    def test_iso_dates(self):
        self.assertEqual(self.kinds("Valid until 2027-06-30"), [("expiry", "2027-06-30")])

    def test_dates_without_a_cue_are_ignored(self):
        self.assertEqual(self.kinds("Meeting held on 12/08/2026"), [])
        self.assertEqual(self.kinds("Date of Birth: 05/05/1990"), [])

    def test_ancient_and_impossible_dates_are_dropped(self):
        self.assertEqual(self.kinds("Valid till 31/03/2015"), [])
        self.assertEqual(self.kinds("Valid till 31/02/2027"), [])

    def test_renewal_and_expiry_both_found(self):
        self.assertEqual(
            self.kinds("Valid till 31/03/2027 renew before 28/02/2027"),
            [("renewal", "2027-02-28"), ("expiry", "2027-03-31")],
        )

    def test_parse_ai_dates_is_lenient(self):
        cleaned = parse_ai_dates(
            [
                {"label": "Licence valid until", "date": "2027-03-31", "kind": "expiry"},
                {"label": "bad", "date": "31/03/2027", "kind": "expiry"},
                {"label": "weird kind", "date": "2027-04-01", "kind": "bogus"},
                "not a dict",
            ]
        )
        self.assertEqual([c["due_date"].isoformat() for c in cleaned], ["2027-03-31", "2027-04-01"])
        self.assertEqual(cleaned[1]["kind"], "other")
        self.assertEqual(parse_ai_dates(None), [])
        self.assertEqual(parse_ai_dates("nope"), [])

    def test_merge_prefers_ai_label_and_dedupes(self):
        auto = extract_dates_from_text("Valid till 31/03/2027", TODAY)
        ai = parse_ai_dates([{"label": "Shop licence valid until", "date": "2027-03-31", "kind": "expiry"}])
        merged = merge_candidates(auto, ai)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["label"], "Shop licence valid until")
        self.assertEqual(merged[0]["source"], "ai")

    def test_urgency_buckets(self):
        self.assertEqual(urgency_for(TODAY - timedelta(days=1), "open", TODAY), (-1, "overdue"))
        self.assertEqual(urgency_for(TODAY + timedelta(days=7), "open", TODAY), (7, "critical"))
        self.assertEqual(urgency_for(TODAY + timedelta(days=30), "open", TODAY), (30, "soon"))
        self.assertEqual(urgency_for(TODAY + timedelta(days=31), "open", TODAY), (31, "upcoming"))
        self.assertEqual(urgency_for(TODAY - timedelta(days=5), "done", TODAY)[1], "done")


class DatabaseTestCase(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        ensure_deadline_edit_column(engine)  # same step the app runs at startup, for DBs built before it
        self.db = SessionLocal()
        self._wipe()

    def tearDown(self):
        self._wipe()
        self.db.close()

    def _wipe(self):
        for model in (Deadline, DocumentInsight, BusinessProfile, TimingTrial, AuditLog, Document):
            self.db.query(model).delete()
        self.db.commit()

    def make_document(self, *, owner="citizen_demo", ocr_text="", title="Doc", **extra):
        document = Document(
            title=title, department="General Administration", original_filename=f"{title}.png",
            filename=f"{title}-{owner}-{datetime.now().timestamp()}.png", filepath=f"uploads/{title}.png",
            filesize=10, filetype="png", uploaded_by=owner, status="Pending", ocr_text=ocr_text, **extra,
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document


class DeadlineSyncTests(DatabaseTestCase):
    def test_sync_is_idempotent_and_respects_done(self):
        document = self.make_document(ocr_text="Valid till 31/03/2027")
        candidates = merge_candidates(extract_dates_from_text(document.ocr_text, TODAY), [])

        self.assertEqual(sync_document_deadlines(self.db, document_id=document.id, owner="citizen_demo", candidates=candidates), 1)
        self.assertEqual(sync_document_deadlines(self.db, document_id=document.id, owner="citizen_demo", candidates=candidates), 0)
        self.assertEqual(self.db.query(Deadline).count(), 1)

        row = self.db.query(Deadline).one()
        row.status = "done"
        self.db.commit()
        sync_document_deadlines(self.db, document_id=document.id, owner="citizen_demo", candidates=candidates)
        self.assertEqual(self.db.query(Deadline).one().status, "done")

    def test_stale_open_machine_rows_are_dropped_but_manual_survive(self):
        document = self.make_document(ocr_text="Valid till 31/03/2027")
        sync_document_deadlines(
            self.db, document_id=document.id, owner="citizen_demo",
            candidates=merge_candidates(extract_dates_from_text(document.ocr_text, TODAY), []),
        )
        self.db.add(Deadline(document_id=document.id, owner="citizen_demo", label="Call CA", kind="other",
                             due_date=date(2027, 1, 1), source="manual", status="open"))
        self.db.commit()

        sync_document_deadlines(self.db, document_id=document.id, owner="citizen_demo", candidates=[])
        labels = [d.label for d in self.db.query(Deadline).all()]
        self.assertEqual(labels, ["Call CA"])


class DeadlineRouterTests(DatabaseTestCase):
    """The route functions are called directly (dependencies bypassed) so the
    real queries and error paths run without booting the whole app."""

    owner = User(username="citizen_demo", role="Citizen")

    def create(self, **overrides):
        body = {"label": "GST filing", "due_date": date(2027, 1, 20), "kind": "due", **overrides}
        return deadlines_router.create_deadline(DeadlineCreate(**body), self.owner, self.db)

    def assert_conflict(self, **overrides):
        with self.assertRaises(HTTPException) as caught:
            self.create(**overrides)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIn("already have a reminder", caught.exception.detail)

    def test_duplicate_manual_deadline_is_rejected_even_without_a_document(self):
        self.create()
        self.assert_conflict()
        self.assert_conflict(label="  gst FILING ")  # case and spacing don't make it new
        self.assertEqual(self.db.query(Deadline).count(), 1)

    def test_duplicate_check_respects_document_kind_date_and_owner(self):
        document = self.make_document()
        self.create()
        self.create(kind="renewal")
        self.create(due_date=date(2027, 2, 20))
        self.create(label="GST filing - Q4")
        self.create(document_id=document.id)
        self.assert_conflict(document_id=document.id)  # same document twice is a duplicate
        other = User(username="officer", role="Officer")
        deadlines_router.create_deadline(DeadlineCreate(label="GST filing", due_date=date(2027, 1, 20), kind="due"), other, self.db)
        self.assertEqual(self.db.query(Deadline).count(), 6)

    def test_editing_a_manual_deadline_into_a_duplicate_is_rejected(self):
        self.create()
        second = self.create(due_date=date(2027, 3, 1))
        with self.assertRaises(HTTPException) as caught:
            deadlines_router.update_deadline(second.id, DeadlineUpdate(due_date=date(2027, 1, 20)), self.owner, self.db)
        self.assertEqual(caught.exception.status_code, 409)
        # saving a row without changing its name or date is not a duplicate of itself
        deadlines_router.update_deadline(second.id, DeadlineUpdate(notes="call CA"), self.owner, self.db)

    def test_rescan_keeps_a_users_edit_of_a_machine_found_deadline(self):
        document = self.make_document(ocr_text="Licence valid till 31/03/2027")
        setu_pipeline.process_document_insights(document.id)
        found = self.db.query(Deadline).one()
        self.assertEqual((found.source, found.due_date), ("auto", date(2027, 3, 31)))
        self.assertIsNone(found.detected_date)

        edited = deadlines_router.update_deadline(
            found.id, DeadlineUpdate(label="Renew shop licence", due_date=date(2027, 3, 15)), self.owner, self.db
        )
        self.assertEqual(edited.due_date, date(2027, 3, 15))

        result = deadlines_router.rescan_deadlines(self.owner, self.db)
        self.assertEqual(result.documents_scanned, 1)
        self.assertEqual(result.new_deadlines, 0)  # the original date is not re-added

        self.db.expire_all()
        rows = self.db.query(Deadline).all()
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0].label, rows[0].due_date), ("Renew shop licence", date(2027, 3, 15)))
        self.assertEqual(rows[0].detected_date, date(2027, 3, 31))

        # ...and it survives repeated rescans, and the edited row is not "stale"
        deadlines_router.rescan_deadlines(self.owner, self.db)
        self.db.expire_all()
        self.assertEqual([r.label for r in self.db.query(Deadline).all()], ["Renew shop licence"])

    def test_unedited_machine_rows_still_follow_the_text(self):
        document = self.make_document(ocr_text="Licence valid till 31/03/2027")
        setu_pipeline.process_document_insights(document.id)
        document.ocr_text = "Licence valid till 30/06/2027"
        self.db.commit()
        deadlines_router.rescan_deadlines(self.owner, self.db)
        self.db.expire_all()
        self.assertEqual([r.due_date for r in self.db.query(Deadline).all()], [date(2027, 6, 30)])

    def test_notes_and_status_edits_do_not_freeze_a_machine_row(self):
        document = self.make_document(ocr_text="Licence valid till 31/03/2027")
        setu_pipeline.process_document_insights(document.id)
        found = self.db.query(Deadline).one()
        deadlines_router.update_deadline(found.id, DeadlineUpdate(notes="ask CA"), self.owner, self.db)
        self.db.expire_all()
        self.assertIsNone(self.db.query(Deadline).one().detected_date)


class SchemeTests(DatabaseTestCase):
    def match(self, username="citizen_demo"):
        return {s["id"]: s for s in scheme_service.match_schemes(self.db, username)["schemes"]}

    def test_catalog_loads_and_has_sources(self):
        catalog = scheme_service.load_catalog()
        self.assertGreaterEqual(len(catalog["schemes"]), 8)
        for scheme in catalog["schemes"]:
            self.assertTrue(scheme["apply"]["url"].startswith("https://"), scheme["id"])
            self.assertTrue(scheme["required_docs"] or scheme["id"] == "x", scheme["id"])

    def test_blank_profile_gives_possible_not_likely(self):
        matches = self.match()
        self.assertTrue(matches)
        self.assertTrue(all(m["match"] == "possible" for m in matches.values()))

    def test_farmer_matches_pm_kisan_and_not_mudra(self):
        scheme_service.save_profile(self.db, "citizen_demo", {"entity_type": "farmer", "business_stage": "running", "sector": "agriculture"})
        matches = self.match()
        self.assertEqual(matches["pm_kisan"]["match"], "likely")
        self.assertNotIn("mudra", matches)
        self.assertNotIn("pm_svanidhi", matches)

    def test_stand_up_india_needs_woman_or_sc_st(self):
        base = {"entity_type": "individual", "business_stage": "planning", "sector": "manufacturing"}
        scheme_service.save_profile(self.db, "citizen_demo", {**base, "gender": "female"})
        self.assertEqual(self.match()["standup_india"]["match"], "likely")

        scheme_service.save_profile(self.db, "citizen_demo", {**base, "gender": "male", "social_category": "general"})
        self.assertNotIn("standup_india", self.match())

        scheme_service.save_profile(self.db, "citizen_demo", {**base, "gender": "male", "social_category": "sc"})
        self.assertEqual(self.match()["standup_india"]["match"], "likely")

        scheme_service.save_profile(self.db, "citizen_demo", {**base, "gender": "", "social_category": ""})
        self.assertEqual(self.match()["standup_india"]["match"], "possible")

    def test_pmegp_is_for_new_ventures_only_and_boosts_special_categories(self):
        scheme_service.save_profile(self.db, "citizen_demo", {"entity_type": "individual", "business_stage": "running", "sector": "services"})
        self.assertNotIn("pmegp", self.match())
        scheme_service.save_profile(
            self.db, "citizen_demo",
            {"entity_type": "individual", "business_stage": "planning", "sector": "services", "gender": "female"},
        )
        pmegp = self.match()["pmegp"]
        self.assertEqual(pmegp["match"], "likely")
        self.assertEqual(len(pmegp["boosts"]), 1)

    def test_readiness_follows_uploaded_documents(self):
        scheme_service.save_profile(self.db, "citizen_demo", {"entity_type": "farmer", "business_stage": "running", "sector": "agriculture"})
        before = self.match()["pm_kisan"]
        self.assertEqual(before["readiness_percent"], 0)

        aadhaar = self.make_document(ocr_text="x", title="a")
        land = self.make_document(ocr_text="x", title="b")
        self.db.add_all([
            DocumentInsight(document_id=aadhaar.id, doc_types=["aadhaar"]),
            DocumentInsight(document_id=land.id, doc_types=["land_712"]),
        ])
        self.db.commit()
        after = self.match()["pm_kisan"]
        self.assertEqual(after["readiness_percent"], 67)
        self.assertEqual([d["have"] for d in after["required_docs"]], [True, True, False])

    def test_other_peoples_documents_are_not_counted(self):
        scheme_service.save_profile(self.db, "citizen_demo", {"entity_type": "farmer", "business_stage": "running", "sector": "agriculture"})
        other = self.make_document(owner="someone_else", ocr_text="x", title="c")
        self.db.add(DocumentInsight(document_id=other.id, doc_types=["aadhaar", "land_712", "bank_proof"]))
        self.db.commit()
        self.assertEqual(self.match()["pm_kisan"]["readiness_percent"], 0)

    def test_reasons_name_the_profile_answers_and_the_documents_held(self):
        scheme_service.save_profile(
            self.db, "citizen_demo",
            {"entity_type": "micro_enterprise", "business_stage": "running", "sector": "services", "social_category": "obc"},
        )
        udyam = self.make_document(ocr_text="x", title="u")
        self.db.add(DocumentInsight(document_id=udyam.id, doc_types=["udyam"]))
        self.db.commit()

        cgtmse = self.match()["cgtmse"]
        self.assertEqual(cgtmse["match"], "likely")
        self.assertIn("Entity type: Micro enterprise", cgtmse["reasons"])
        self.assertIn("Sector: Services", cgtmse["reasons"])
        self.assertIn("You have: Udyam registration", cgtmse["reasons"])
        self.assertEqual(len(cgtmse["reasons"]), len(set(cgtmse["reasons"])))
        # an answer that no rule asks about is not quoted as a reason
        self.assertNotIn("Social category: OBC", cgtmse["reasons"])

    def test_reasons_only_quote_the_any_of_branch_that_matched(self):
        base = {"entity_type": "individual", "business_stage": "planning", "sector": "manufacturing"}
        scheme_service.save_profile(self.db, "citizen_demo", {**base, "gender": "male", "social_category": "sc"})
        reasons = self.match()["standup_india"]["reasons"]
        self.assertIn("Social category: SC", reasons)
        self.assertFalse([r for r in reasons if r.startswith("Gender")])

    def test_blank_profile_and_no_documents_give_no_reasons(self):
        self.assertTrue(all(m["reasons"] == [] for m in self.match().values()))

    def test_invalid_profile_value_is_rejected(self):
        with self.assertRaises(ValueError):
            scheme_service.save_profile(self.db, "citizen_demo", {"entity_type": "wizard"})


class ImpactTests(DatabaseTestCase):
    def test_assumed_until_enough_trials_then_measured(self):
        document = self.make_document(ocr_text="Valid till 31/03/2027")
        impact = impact_service.build_impact(self.db, username="citizen_demo", role="Citizen")
        self.assertEqual(impact["time"]["basis"], "assumed")
        self.assertEqual(impact["documents"]["digitised"], 1)

        for seconds in (120, 100, 140):
            impact_service.add_trial(self.db, username="citizen_demo", method="manual", seconds=seconds, note=None)
        impact = impact_service.build_impact(self.db, username="citizen_demo", role="Citizen")
        self.assertEqual(impact["time"]["basis"], "assumed")  # still no SetuDocs trials

        for seconds in (10, 20, 15):
            impact_service.add_trial(self.db, username="citizen_demo", method="setudocs", seconds=seconds, note=None)
        impact = impact_service.build_impact(self.db, username="citizen_demo", role="Citizen")
        self.assertEqual(impact["time"]["basis"], "measured")
        self.assertEqual(impact["time"]["manual_seconds_used"], 120.0)
        self.assertEqual(impact["time"]["setudocs_seconds_used"], 15.0)
        self.assertEqual(impact["time"]["speedup"], 8.0)
        self.assertEqual(impact["time"]["minutes_saved_estimate"], round(1 * 105 / 60, 1))
        self.assertIsNotNone(document)

    def test_scope_personal_vs_workspace(self):
        self.make_document(owner="citizen_demo", ocr_text="a", title="mine")
        self.make_document(owner="other", ocr_text="b", title="theirs")
        self.assertEqual(impact_service.build_impact(self.db, username="citizen_demo", role="Citizen")["documents"]["total"], 1)
        staff = impact_service.build_impact(self.db, username="officer", role="Officer")
        self.assertEqual(staff["documents"]["total"], 2)
        self.assertEqual(staff["scope"], "workspace")
        self.assertIsNone(staff["schemes"])

    def test_pipeline_seconds_come_from_the_audit_log(self):
        document = self.make_document(ocr_text="a")
        self.db.add(AuditLog(user="citizen_demo", action="AI Completed", document_id=document.id,
                             timestamp=document.upload_date + timedelta(seconds=12)))
        self.db.commit()
        impact = impact_service.build_impact(self.db, username="citizen_demo", role="Citizen")
        self.assertAlmostEqual(impact["documents"]["avg_pipeline_seconds"], 12.0, delta=1.0)

    def test_deadline_buckets_are_counted(self):
        document = self.make_document(ocr_text="a")
        today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
        for kind, offset in (("expiry", -3), ("due", 4), ("renewal", 20), ("other", 90)):
            self.db.add(Deadline(document_id=document.id, owner="citizen_demo", label=kind, kind=kind,
                                 due_date=today + timedelta(days=offset), source="auto", status="open"))
        self.db.commit()
        deadlines = impact_service.build_impact(self.db, username="citizen_demo", role="Citizen")["deadlines"]
        self.assertEqual((deadlines["overdue"], deadlines["critical"], deadlines["soon"], deadlines["upcoming"]), (1, 1, 1, 1))
        self.assertEqual(deadlines["at_risk"], 3)


class PipelineIntegrationTests(DatabaseTestCase):
    OCR = "Shop and Establishment Registration Certificate\nIssued on 01/04/2024\nValid till 31/03/2027"
    GEMINI = """{
      "title": "Shop Registration", "summary": "A shop licence.", "department": "Municipal",
      "category": "Licence", "keywords": ["shop", "licence"], "confidence": 90,
      "dates": [{"label": "Shop licence valid until", "date": "2027-03-31", "kind": "expiry"}]
    }"""

    def setUp(self):
        super().setUp()
        settings.GEMINI_API_KEY = "test-key"

    def test_ai_success_creates_types_and_deadlines_with_ai_label(self):
        document = self.make_document(ocr_text=self.OCR)
        with patch.object(ai_service, "_call_gemini", return_value=self.GEMINI):
            ai_service.process_document_ai(document.id)

        self.db.expire_all()
        self.assertTrue(self.db.get(Document, document.id).ai_processed)
        self.assertEqual(self.db.get(Document, document.id).ai_title, "Shop Registration")

        insight = self.db.query(DocumentInsight).filter_by(document_id=document.id).one()
        self.assertIn("shop_act", insight.doc_types)
        deadline = self.db.query(Deadline).filter_by(document_id=document.id).one()
        self.assertEqual(deadline.due_date, date(2027, 3, 31))
        self.assertEqual(deadline.label, "Shop licence valid until")
        self.assertEqual(deadline.source, "ai")

    def test_ai_failure_still_yields_deadlines_from_ocr_text(self):
        settings.GEMINI_API_KEY = ""
        document = self.make_document(ocr_text=self.OCR)
        ai_service.process_document_ai(document.id)

        self.db.expire_all()
        self.assertFalse(self.db.get(Document, document.id).ai_processed)
        self.assertIn("GEMINI_API_KEY", self.db.get(Document, document.id).ai_error)
        deadline = self.db.query(Deadline).filter_by(document_id=document.id).one()
        self.assertEqual(deadline.source, "auto")
        self.assertEqual(deadline.due_date, date(2027, 3, 31))
        settings.GEMINI_API_KEY = "test-key"

    def test_garbage_dates_from_ai_never_break_extraction(self):
        document = self.make_document(ocr_text="Plain letter with no obligations")
        response = self.GEMINI.replace('"2027-03-31"', '"soon-ish"')
        with patch.object(ai_service, "_call_gemini", return_value=response):
            ai_service.process_document_ai(document.id)
        self.db.expire_all()
        self.assertTrue(self.db.get(Document, document.id).ai_processed)
        self.assertEqual(self.db.query(Deadline).count(), 0)

    def test_insight_step_never_raises(self):
        with patch.object(setu_pipeline, "detect_document_types", side_effect=RuntimeError("boom")):
            self.assertIsNone(setu_pipeline.process_document_insights(12345))
            document = self.make_document(ocr_text=self.OCR)
            self.assertIsNone(setu_pipeline.process_document_insights(document.id))


if __name__ == "__main__":
    unittest.main(verbosity=2)
