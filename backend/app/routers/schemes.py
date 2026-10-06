"""Scheme Matcher endpoints. Matching is always against the caller's OWN
uploads and profile - staff accounts get their own matches, never a client's."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.setu import ProfileUpdate
from app.services import audit_service, scheme_service
from app.services.blackout import guard_primary_store

router = APIRouter(prefix="/api/schemes", tags=["scheme-matcher"])


@router.get("/matches")
def get_matches(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return scheme_service.match_schemes(db, current_user.username)


@router.put("/profile", dependencies=[Depends(guard_primary_store)])
def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        scheme_service.save_profile(db, current_user.username, body.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    audit_service.log_action(db, user=current_user.username, action="Profile Updated", details="scheme profile")
    return scheme_service.match_schemes(db, current_user.username)
