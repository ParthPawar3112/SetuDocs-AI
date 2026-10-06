"""SetuDocs insight pipeline - the step that runs after OCR (and AI, when it
succeeds) has produced text for a document.

It is intentionally isolated from the GovDocs pipeline: it opens its own DB
session, and any failure is logged and swallowed, so a problem here can never
mark an upload as failed. It also runs when the AI step failed (quota, no API
key) because everything it needs is the OCR text - that is what keeps Deadline
Guard and the Scheme Matcher working in a demo with no Gemini connection.
"""
import logging

from app.db.database import SessionLocal
from app.models.document import Document
from app.models.setu import DocumentInsight
from app.services import audit_service
from app.services.deadline_service import (
    extract_dates_from_text,
    merge_candidates,
    sync_document_deadlines,
)
from app.services.doc_types import detect_document_types

logger = logging.getLogger("setudocs.pipeline")


def process_document_insights(document_id: int, ai_dates: list[dict] | None = None) -> dict | None:
    """Detect document types and deadlines for one document. Never raises."""
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None or not document.ocr_text:
            return None

        doc_types = detect_document_types(
            document.ocr_text,
            title=document.ai_title or document.title,
            category=document.ai_category,
            keywords=document.ai_keywords,
        )
        insight = db.query(DocumentInsight).filter(DocumentInsight.document_id == document_id).first()
        if insight is None:
            db.add(DocumentInsight(document_id=document_id, doc_types=doc_types))
        else:
            insight.doc_types = doc_types
        db.commit()

        candidates = merge_candidates(extract_dates_from_text(document.ocr_text), ai_dates or [])
        added = sync_document_deadlines(
            db, document_id=document_id, owner=document.uploaded_by, candidates=candidates
        )

        audit_service.log_action(
            db,
            user=document.uploaded_by,
            action="Insights Extracted",
            document_id=document_id,
            details=f"types={','.join(doc_types) or 'none'}; deadlines={len(candidates)} ({added} new)",
        )
        logger.info(
            f"SetuDocs insights for document {document_id}: types={doc_types}, deadlines={len(candidates)}"
        )
        return {"doc_types": doc_types, "deadlines": len(candidates), "new_deadlines": added}
    except Exception:  # noqa: BLE001 - must never break the upload pipeline
        logger.exception(f"SetuDocs insight extraction failed for document {document_id}")
        db.rollback()
        return None
    finally:
        db.close()
