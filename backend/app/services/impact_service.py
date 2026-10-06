"""Impact Dashboard - turns the app's own records into numbers a judge (or a
shop owner) can check.

Honesty rules, because this page ends up in a pitch:
  * Counts and pipeline times are measured from the database and audit log.
  * "Minutes saved" is an ESTIMATE built from stopwatch trials the user ran
    themselves (TimingTrial). Until at least MIN_TRIALS trials exist for each
    method, the dashboard falls back to clearly-labelled default assumptions
    and says so (`basis: "assumed"`), rather than presenting them as measured.
  * Nothing here is extrapolated to a population - it describes this
    workspace's own documents only.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.setu import Deadline, DocumentInsight, TimingTrial
from app.services import scheme_service
from app.services.deadline_service import today_ist, urgency_for
from app.services.doc_types import label_for

MIN_TRIALS = 3
# Placeholders used only until real trials exist. Shown to the user as assumptions.
DEFAULT_MANUAL_SECONDS = 300.0   # ~5 min to dig a document out of folders / a phone gallery
DEFAULT_ASSISTED_SECONDS = 20.0  # typing a query and opening the result
TIMELINE_DAYS = 14


def _to_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _pipeline_seconds(db: Session, documents: list[Document]) -> list[float]:
    """Upload -> 'AI Completed' (or 'OCR Completed' when AI was unavailable)."""
    if not documents:
        return []
    ids = [d.id for d in documents]
    rows = (
        db.query(AuditLog.document_id, AuditLog.action, AuditLog.timestamp)
        .filter(AuditLog.document_id.in_(ids), AuditLog.action.in_(("AI Completed", "OCR Completed")))
        .all()
    )
    ocr_done: dict[int, datetime] = {}
    ai_done: dict[int, datetime] = {}
    for document_id, action, timestamp in rows:
        target = ai_done if action == "AI Completed" else ocr_done
        target[document_id] = _to_naive_utc(timestamp)

    seconds = []
    for document in documents:
        finished = ai_done.get(document.id) or ocr_done.get(document.id)
        if finished is None:
            continue
        delta = (finished - _to_naive_utc(document.upload_date)).total_seconds()
        if 0 <= delta < 3600:
            seconds.append(delta)
    return seconds


def _trial_stats(db: Session, username: str | None) -> dict:
    query = db.query(TimingTrial)
    if username:
        query = query.filter(TimingTrial.username == username)
    trials = query.all()

    def stats(method: str) -> dict:
        values = [t.seconds for t in trials if t.method == method]
        return {
            "count": len(values),
            "average_seconds": round(sum(values) / len(values), 1) if values else None,
        }

    manual, assisted = stats("manual"), stats("setudocs")
    measured = manual["count"] >= MIN_TRIALS and assisted["count"] >= MIN_TRIALS
    manual_s = manual["average_seconds"] if measured else DEFAULT_MANUAL_SECONDS
    assisted_s = assisted["average_seconds"] if measured else DEFAULT_ASSISTED_SECONDS
    speedup = round(manual_s / assisted_s, 1) if assisted_s else None
    return {
        "manual": manual,
        "setudocs": assisted,
        "min_trials": MIN_TRIALS,
        "basis": "measured" if measured else "assumed",
        "manual_seconds_used": round(manual_s, 1),
        "setudocs_seconds_used": round(assisted_s, 1),
        "speedup": speedup,
    }


def build_impact(db: Session, *, username: str, role: str) -> dict:
    staff = role in ("Admin", "Officer")
    doc_query = db.query(Document)
    deadline_query = db.query(Deadline)
    if not staff:
        doc_query = doc_query.filter(Document.uploaded_by == username)
        deadline_query = deadline_query.filter(Deadline.owner == username)

    documents = doc_query.all()
    doc_ids = [d.id for d in documents]
    digitised = [d for d in documents if d.ocr_text]
    structured = [d for d in documents if d.ai_processed]

    pipeline = _pipeline_seconds(db, digitised)
    avg_pipeline = round(sum(pipeline) / len(pipeline), 1) if pipeline else None

    # --- deadlines
    today = today_ist()
    deadlines = deadline_query.all()
    open_rows = [d for d in deadlines if d.status == "open"]
    buckets = Counter(urgency_for(d.due_date, d.status, today)[1] for d in deadlines)
    found_automatically = sum(1 for d in deadlines if d.source in ("auto", "ai"))

    # --- document mix
    insights = db.query(DocumentInsight).filter(DocumentInsight.document_id.in_(doc_ids)).all() if doc_ids else []
    type_counter: Counter = Counter()
    for insight in insights:
        for doc_type in insight.doc_types or []:
            type_counter[doc_type] += 1
    classified_ids = {i.document_id for i in insights if i.doc_types}

    # --- activity over the last TIMELINE_DAYS days
    start = today - timedelta(days=TIMELINE_DAYS - 1)
    per_day: Counter = Counter()
    for document in documents:
        uploaded = _to_naive_utc(document.upload_date).date()
        if uploaded >= start:
            per_day[uploaded] += 1
    timeline = [
        {"date": (start + timedelta(days=i)).isoformat(), "documents": per_day.get(start + timedelta(days=i), 0)}
        for i in range(TIMELINE_DAYS)
    ]

    trials = _trial_stats(db, None if staff else username)
    saved_per_doc = max(0.0, trials["manual_seconds_used"] - trials["setudocs_seconds_used"])
    minutes_saved = round(len(digitised) * saved_per_doc / 60, 1)

    schemes = None
    if not staff:
        matched = scheme_service.match_schemes(db, username)
        schemes = {
            "likely": sum(1 for s in matched["schemes"] if s["match"] == "likely"),
            "possible": sum(1 for s in matched["schemes"] if s["match"] == "possible"),
            "profile_complete": matched["profile"]["is_complete"],
        }

    return {
        "scope": "workspace" if staff else "personal",
        "documents": {
            "total": len(documents),
            "digitised": len(digitised),
            "ai_structured": len(structured),
            "classified": len(classified_ids),
            "avg_pipeline_seconds": avg_pipeline,
        },
        "deadlines": {
            "tracked": len(deadlines),
            "open": len(open_rows),
            "found_automatically": found_automatically,
            "overdue": buckets.get("overdue", 0),
            "critical": buckets.get("critical", 0),
            "soon": buckets.get("soon", 0),
            "upcoming": buckets.get("upcoming", 0),
            "done": buckets.get("done", 0),
            "at_risk": buckets.get("overdue", 0) + buckets.get("critical", 0) + buckets.get("soon", 0),
        },
        "schemes": schemes,
        "time": {
            **trials,
            "minutes_saved_estimate": minutes_saved,
            "formula": "digitised documents x (manual seconds - SetuDocs seconds) / 60",
        },
        "by_type": [
            {"type": t, "label": label_for(t), "count": c} for t, c in type_counter.most_common(8)
        ],
        "timeline": timeline,
    }


def add_trial(db: Session, *, username: str, method: str, seconds: float, note: str | None) -> TimingTrial:
    trial = TimingTrial(username=username, method=method, seconds=seconds, note=(note or None))
    db.add(trial)
    db.commit()
    db.refresh(trial)
    return trial


def list_trials(db: Session, *, username: str | None, limit: int = 20) -> list[TimingTrial]:
    query = db.query(TimingTrial)
    if username:
        query = query.filter(TimingTrial.username == username)
    return query.order_by(TimingTrial.id.desc()).limit(limit).all()


def clear_trials(db: Session, *, username: str) -> int:
    count = db.query(TimingTrial).filter(TimingTrial.username == username).delete()
    db.commit()
    return count
