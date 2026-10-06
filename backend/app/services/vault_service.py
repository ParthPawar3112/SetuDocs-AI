"""Vault search - find one of your own documents, in Marathi or English.

It reuses GovDocs AI's search internals (the same searchable columns and the
same rapidfuzz typo fallback) and adds what a Marathi-speaking shop owner
actually needs:

  * Bilingual synonym expansion. The AI keeps `category`/`keywords` in English
    on purpose, so a Marathi query like "सातबारा" would never reach an English
    document and vice versa. Each query word is expanded to the other-language
    terms for the same paperwork concept (सातबारा <-> 7/12 <-> land record),
    and Devanagari digits are normalised (७/१२ -> 7/12).
  * Scoping. An owner (Citizen) only ever searches their own uploads; staff
    search the workspace, exactly like Smart Search.
  * A match snippet and the measured server time, so results show *why* they
    matched and the Impact Dashboard can quote a real number.

The synonym table is small and hand-curated for the document types SetuDocs
recognises; it is a lookup, not translation, and it is easy to extend.
"""
import re
import time

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.setu import DocumentInsight
from app.services import search_service
from app.services.deadline_service import normalise_digits
from app.services.doc_types import label_for

SNIPPET_RADIUS = 90
SNIPPET_FALLBACK = 200
MAX_RESULTS = 50

# Each row is one concept; every term in a row is treated as interchangeable.
SYNONYM_GROUPS: list[set[str]] = [
    {"सातबारा", "7/12", "satbara", "saatbara", "land record", "land extract", "उतारा"},
    {"शिधापत्रिका", "रेशन", "ration", "ration card"},
    {"आधार", "aadhaar", "aadhar"},
    {"पॅन", "पान", "pan", "pan card"},
    {"जीएसटी", "gst", "gstin"},
    {"उद्यम", "udyam", "msme", "udyog"},
    {"दुकान", "दुकाने", "shop", "shops", "establishment", "आस्थापना", "gumasta", "गुमास्ता"},
    {"परवाना", "licence", "license", "licences", "licenses"},
    {"व्यापार", "trade"},
    {"विमा", "insurance", "policy"},
    {"बँक", "bank", "passbook", "पासबुक"},
    {"भाडेकरार", "rent", "agreement", "lease"},
    {"वीज", "electricity", "msedcl", "महावितरण"},
    {"उत्पन्न", "income"},
    {"दाखला", "certificate", "प्रमाणपत्र"},
    {"जात", "caste"},
    {"मुदत", "वैधता", "expiry", "validity", "valid", "expires"},
    {"नूतनीकरण", "renewal", "renew"},
    {"अग्निशमन", "fire", "noc"},
    {"अन्न", "fssai", "food"},
    {"प्रकल्प", "project", "dpr"},
]

_SYNONYM_INDEX: dict[str, set[str]] = {}
for _group in SYNONYM_GROUPS:
    for _term in _group:
        _SYNONYM_INDEX.setdefault(_term.lower(), set()).update(_group)


def expand_token(token: str) -> list[str]:
    """The token itself plus any other-language equivalents."""
    base = normalise_digits(token).strip().lower()
    variants = {base} | {t.lower() for t in _SYNONYM_INDEX.get(base, set())}
    # keep the original spelling first so exact matches rank in the snippet
    ordered = [base] + sorted(v for v in variants if v != base)
    return [v for v in ordered if v]


def _snippet(document: Document, variants: list[str]) -> str | None:
    for field in ("ocr_text", "ai_summary", "description"):
        text = getattr(document, field) or ""
        if not text:
            continue
        lowered = normalise_digits(text).lower()
        for variant in variants:
            index = lowered.find(variant)
            if index == -1:
                continue
            start = max(0, index - SNIPPET_RADIUS)
            end = min(len(text), index + len(variant) + SNIPPET_RADIUS)
            snippet = re.sub(r"\s+", " ", text[start:end]).strip()
            return ("..." if start > 0 else "") + snippet + ("..." if end < len(text) else "")
    for field in ("ocr_text", "ai_summary", "description"):
        text = getattr(document, field) or ""
        if text:
            return re.sub(r"\s+", " ", text[:SNIPPET_FALLBACK]).strip()
    return None


def search_vault(db: Session, *, username: str, role: str, q: str) -> dict:
    started = time.perf_counter()
    query = db.query(Document)
    if role not in ("Admin", "Officer"):
        query = query.filter(Document.uploaded_by == username)

    tokens = [t for t in re.split(r"\s+", normalise_digits(q).strip()) if t]
    used_fuzzy = False
    expanded: list[list[str]] = [expand_token(t) for t in tokens]

    if expanded:
        conditions = [
            or_(*[search_service._token_condition(variant) for variant in variants]) for variants in expanded
        ]
        documents = query.filter(and_(*conditions)).order_by(Document.upload_date.desc()).limit(MAX_RESULTS).all()
        if not documents:
            candidates = query.limit(search_service.FUZZY_CANDIDATE_CAP).all()
            documents = search_service._fuzzy_fallback(candidates, " ".join(tokens))[:MAX_RESULTS]
            used_fuzzy = True
    else:
        documents = query.order_by(Document.upload_date.desc()).limit(MAX_RESULTS).all()

    ids = [d.id for d in documents]
    types_by_doc: dict[int, list[str]] = {}
    if ids:
        for insight in db.query(DocumentInsight).filter(DocumentInsight.document_id.in_(ids)).all():
            types_by_doc[insight.document_id] = insight.doc_types or []

    flat_variants = [v for variants in expanded for v in variants]
    items = [
        {
            "id": d.id,
            "title": d.ai_title or d.title,
            "original_filename": d.original_filename,
            "filetype": d.filetype,
            "category": d.ai_category,
            "doc_types": [{"type": t, "label": label_for(t)} for t in types_by_doc.get(d.id, [])],
            "upload_date": d.upload_date,
            "snippet": _snippet(d, flat_variants) if flat_variants else None,
            "uploaded_by": d.uploaded_by if role in ("Admin", "Officer") else None,
        }
        for d in documents
    ]
    return {
        "query": q,
        "expanded_terms": sorted({v for variants in expanded for v in variants[1:]})[:12],
        "items": items,
        "total": len(items),
        "used_fuzzy_fallback": used_fuzzy,
        "elapsed_ms": round((time.perf_counter() - started) * 1000, 1),
    }
