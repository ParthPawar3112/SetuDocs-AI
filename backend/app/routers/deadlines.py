"""Deadline Guard endpoints.

Scoping: an owner (Citizen) only ever sees and edits their own deadlines.
Staff (Admin / Officer - a CA or CSC operator in the SetuDocs framing) see the
whole workspace, which is what makes a "deadlines across all my clients" board
possible. Out-of-scope ids return 404, never 403, so existence isn't leaked.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.document import Document
from app.models.setu import Deadline
from app.models.user import User
from app.schemas.setu import (
    DeadlineCreate,
    DeadlineListResponse,
    DeadlineResponse,
    DeadlineSummary,
    DeadlineUpdate,
    RescanResponse,
)
from app.services import audit_service, setu_pipeline
from app.services.blackout import guard_primary_store
from app.services.deadline_service import today_ist, urgency_for

router = APIRouter(prefix="/api/deadlines", tags=["deadline-guard"])


def _is_staff(user: User) -> bool:
    return user.role in ("Admin", "Officer")


def _scoped_query(db: Session, user: User):
    query = db.query(Deadline)
    if not _is_staff(user):
        query = query.filter(Deadline.owner == user.username)
    return query


def _get_in_scope(db: Session, user: User, deadline_id: int) -> Deadline:
    row = _scoped_query(db, user).filter(Deadline.id == deadline_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found")
    return row


DUPLICATE_MESSAGE = "You already have a reminder with the same name, date and type."


def _manual_duplicate_exists(
    db: Session,
    *,
    owner: str,
    label: str,
    due_date,
    kind: str,
    document_id: int | None,
    exclude_id: int | None = None,
) -> bool:
    """Same owner, label (ignoring case and spacing), date, type and document. A
    missing document counts as a value too - the table's unique constraint can't
    catch that case because SQL treats NULL as different from NULL."""
    query = db.query(Deadline.id).filter(
        Deadline.source == "manual",
        Deadline.owner == owner,
        func.lower(Deadline.label) == label.strip().lower(),
        Deadline.due_date == due_date,
        Deadline.kind == kind,
        Deadline.document_id.is_(None) if document_id is None else Deadline.document_id == document_id,
    )
    if exclude_id is not None:
        query = query.filter(Deadline.id != exclude_id)
    return query.first() is not None


def _titles(db: Session, rows: list[Deadline]) -> dict[int, str]:
    ids = {r.document_id for r in rows if r.document_id}
    if not ids:
        return {}
    docs = db.query(Document.id, Document.title, Document.ai_title).filter(Document.id.in_(ids)).all()
    return {doc_id: (ai_title or title) for doc_id, title, ai_title in docs}


def _to_response(row: Deadline, titles: dict[int, str]) -> DeadlineResponse:
    days_left, urgency = urgency_for(row.due_date, row.status)
    return DeadlineResponse(
        id=row.id,
        document_id=row.document_id,
        document_title=titles.get(row.document_id) if row.document_id else None,
        owner=row.owner,
        label=row.label,
        kind=row.kind,
        due_date=row.due_date,
        source=row.source,
        status=row.status,
        evidence=row.evidence,
        notes=row.notes,
        days_left=days_left,
        urgency=urgency,
    )


@router.get("", response_model=DeadlineListResponse)
def list_deadlines(
    status_filter: str = Query(default="open", alias="status", pattern="^(open|done|dismissed|all)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeadlineListResponse:
    all_rows = _scoped_query(db, current_user).order_by(Deadline.due_date.asc(), Deadline.id.asc()).all()

    summary = DeadlineSummary()
    for row in all_rows:
        if row.status == "dismissed":
            continue
        _, bucket = urgency_for(row.due_date, row.status)
        setattr(summary, bucket, getattr(summary, bucket) + 1)
        if row.status == "open":
            summary.open += 1

    rows = all_rows if status_filter == "all" else [r for r in all_rows if r.status == status_filter]
    titles = _titles(db, rows)
    return DeadlineListResponse(
        items=[_to_response(r, titles) for r in rows],
        summary=summary,
        scope="workspace" if _is_staff(current_user) else "personal",
        today=today_ist(),
    )


@router.post(
    "",
    response_model=DeadlineResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(guard_primary_store)],
)
def create_deadline(
    body: DeadlineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeadlineResponse:
    if body.document_id is not None:
        document = db.get(Document, body.document_id)
        if document is None or (not _is_staff(current_user) and document.uploaded_by != current_user.username):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if _manual_duplicate_exists(
        db, owner=current_user.username, label=body.label, due_date=body.due_date,
        kind=body.kind, document_id=body.document_id,
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE_MESSAGE)

    row = Deadline(
        document_id=body.document_id,
        owner=current_user.username,
        label=body.label.strip(),
        kind=body.kind,
        due_date=body.due_date,
        source="manual",
        status="open",
        notes=body.notes,
    )
    db.add(row)
    try:
        db.commit()
    except Exception:  # unique (document, date, kind) collision
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That deadline is already tracked.")
    db.refresh(row)
    audit_service.log_action(
        db, user=current_user.username, action="Deadline Added", document_id=row.document_id, details=row.label
    )
    return _to_response(row, _titles(db, [row]))


@router.patch("/{deadline_id}", response_model=DeadlineResponse, dependencies=[Depends(guard_primary_store)])
def update_deadline(
    deadline_id: int,
    body: DeadlineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeadlineResponse:
    row = _get_in_scope(db, current_user, deadline_id)
    changes = body.model_dump(exclude_unset=True)

    new_label = changes.get("label", row.label)
    new_date = changes.get("due_date", row.due_date)
    if "label" in changes:
        changes["label"] = changes["label"].strip()
        new_label = changes["label"]

    if row.source == "manual":
        if (new_label, new_date) != (row.label, row.due_date) and _manual_duplicate_exists(
            db, owner=row.owner, label=new_label, due_date=new_date, kind=row.kind,
            document_id=row.document_id, exclude_id=row.id,
        ):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE_MESSAGE)
    elif row.detected_date is None and (new_label != row.label or new_date != row.due_date):
        # First edit of a machine-found row: remember what the scanner found so a
        # rescan keeps this edit instead of re-adding the original.
        row.detected_date = row.due_date

    for field, value in changes.items():
        setattr(row, field, value)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That deadline is already tracked.")
    db.refresh(row)
    audit_service.log_action(
        db,
        user=current_user.username,
        action="Deadline Updated",
        document_id=row.document_id,
        details=f"{row.label}: {', '.join(changes) or 'no change'}",
    )
    return _to_response(row, _titles(db, [row]))


@router.delete("/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(guard_primary_store)])
def delete_deadline(
    deadline_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Manual reminders are deleted. Machine-found ones are only dismissed, so a
    re-scan of the document doesn't bring them straight back."""
    row = _get_in_scope(db, current_user, deadline_id)
    label, document_id = row.label, row.document_id
    if row.source == "manual":
        db.delete(row)
    else:
        row.status = "dismissed"
    db.commit()
    audit_service.log_action(
        db, user=current_user.username, action="Deadline Removed", document_id=document_id, details=label
    )


@router.post("/rescan", response_model=RescanResponse, dependencies=[Depends(guard_primary_store)])
def rescan_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RescanResponse:
    """Re-run type + deadline detection over documents that already have OCR
    text. This is how documents uploaded before Deadline Guard existed get
    picked up."""
    query = db.query(Document.id).filter(Document.ocr_text.isnot(None))
    if not _is_staff(current_user):
        query = query.filter(Document.uploaded_by == current_user.username)

    scanned = found = new = 0
    for (document_id,) in query.all():
        outcome = setu_pipeline.process_document_insights(document_id)
        if outcome is None:
            continue
        scanned += 1
        found += outcome["deadlines"]
        new += outcome["new_deadlines"]
    return RescanResponse(documents_scanned=scanned, deadlines_found=found, new_deadlines=new)
