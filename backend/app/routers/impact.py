"""Impact Dashboard endpoints, including the stopwatch trials that back the
'manual vs SetuDocs' retrieval comparison."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.setu import TrialCreate, TrialResponse
from app.services import impact_service
from app.services.blackout import guard_primary_store

router = APIRouter(prefix="/api/impact", tags=["impact"])


def _is_staff(user: User) -> bool:
    return user.role in ("Admin", "Officer")


@router.get("")
def get_impact(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return impact_service.build_impact(db, username=current_user.username, role=current_user.role)


@router.get("/trials", response_model=list[TrialResponse])
def get_trials(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return impact_service.list_trials(db, username=None if _is_staff(current_user) else current_user.username)


@router.post(
    "/trials",
    response_model=TrialResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(guard_primary_store)],
)
def create_trial(body: TrialCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return impact_service.add_trial(
        db, username=current_user.username, method=body.method, seconds=body.seconds, note=body.note
    )


@router.delete("/trials", dependencies=[Depends(guard_primary_store)])
def reset_trials(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return {"removed": impact_service.clear_trials(db, username=current_user.username)}
