"""SetuDocs AI models - the tables added on top of the GovDocs AI foundation.

All four are brand-new tables, so Base.metadata.create_all() creates them on
startup and no ALTER TABLE migration is needed (see app/db/migrate.py for why
that is only an issue for new *columns* on existing tables).

  Deadline         - one dated obligation (expiry / renewal / payment due),
                     either read from a document or added by hand.
  BusinessProfile  - the optional facts a person tells us about themselves so
                     the Scheme Matcher can reason about eligibility.
  DocumentInsight  - what kind of document a file is (Udyam certificate, 7/12
                     extract, ...), derived from its OCR text. Types only -
                     identity numbers are never extracted or stored.
  TimingTrial      - one stopwatch measurement for the Impact Dashboard's
                     "manual vs SetuDocs" retrieval test.
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Deadline(Base):
    __tablename__ = "deadlines"
    __table_args__ = (UniqueConstraint("document_id", "due_date", "kind", name="uq_deadline_doc_date_kind"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Nullable: a manually added reminder isn't tied to any document.
    document_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    owner: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    # expiry | renewal | due | other
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="expiry")
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # auto = regex over OCR text, ai = returned by Gemini, manual = user typed it.
    source: Mapped[str] = mapped_column(String(10), nullable=False, default="auto")
    # open | done | dismissed
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="open", index=True)
    evidence: Mapped[str | None] = mapped_column(String(300), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Set the first time a person edits the label or date of a machine-found row:
    # remembers the date the scanner found, so a rescan recognises the row as its
    # own and leaves the person's edit alone instead of re-adding the original.
    # NULL means "never edited" (always NULL for manual rows).
    detected_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    # Every field is optional - a blank means "unknown", never a guess.
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    business_stage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(30), nullable=True)
    state: Mapped[str | None] = mapped_column(String(60), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    social_category: Mapped[str | None] = mapped_column(String(20), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class DocumentInsight(Base):
    __tablename__ = "document_insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    doc_types: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class TimingTrial(Base):
    __tablename__ = "timing_trials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # manual = hunting through folders/phone gallery; setudocs = using the app.
    method: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    seconds: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
