"""Request/response schemas for the SetuDocs AI endpoints (deadlines, schemes, impact)."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ---- Deadline Guard --------------------------------------------------------

class DeadlineResponse(BaseModel):
    id: int
    document_id: int | None
    document_title: str | None = None
    owner: str
    label: str
    kind: str
    due_date: date
    source: str
    status: str
    evidence: str | None
    notes: str | None
    days_left: int
    urgency: str  # overdue | critical | soon | upcoming | done

    model_config = ConfigDict(from_attributes=True)


class DeadlineSummary(BaseModel):
    overdue: int = 0
    critical: int = 0
    soon: int = 0
    upcoming: int = 0
    done: int = 0
    open: int = 0


class DeadlineListResponse(BaseModel):
    items: list[DeadlineResponse]
    summary: DeadlineSummary
    scope: str  # personal | workspace
    today: date


class DeadlineCreate(BaseModel):
    label: str = Field(..., min_length=2, max_length=200)
    due_date: date
    kind: Literal["expiry", "renewal", "due", "other"] = "other"
    notes: str | None = Field(default=None, max_length=1000)
    document_id: int | None = None


class DeadlineUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=200)
    due_date: date | None = None
    status: Literal["open", "done", "dismissed"] | None = None
    notes: str | None = Field(default=None, max_length=1000)


class RescanResponse(BaseModel):
    documents_scanned: int
    deadlines_found: int
    new_deadlines: int


# ---- Scheme Matcher --------------------------------------------------------

class ProfileUpdate(BaseModel):
    entity_type: str | None = None
    business_stage: str | None = None
    sector: str | None = None
    state: str | None = Field(default=None, max_length=60)
    gender: str | None = None
    social_category: str | None = None


# ---- Impact ----------------------------------------------------------------

class TrialCreate(BaseModel):
    method: Literal["manual", "setudocs"]
    seconds: float = Field(..., gt=0, le=3600)
    note: str | None = Field(default=None, max_length=200)


class TrialResponse(BaseModel):
    id: int
    method: str
    seconds: float
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
