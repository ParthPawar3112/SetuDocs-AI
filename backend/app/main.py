"""
SetuDocs AI (built on the GovDocs AI foundation) - FastAPI application entrypoint.

Mounts: authentication (Phase 2), document management (Phase 4), and the
Phase 1 health check. Business logic itself lives in each module's router/
service files, not here - this file only wires the app together.
"""
import logging

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import Base, engine, get_db
from app.db.migrate import (
    ensure_ai_metadata_columns,
    ensure_ai_output_language_column,
    ensure_deadline_edit_column,
    ensure_document_provenance_columns,
    ensure_ocr_text_column,
    ensure_review_columns,
    ensure_search_indexes,
    ensure_user_profile_columns,
    ensure_verification_currency_columns,
)
from app.models.app_setting import AppSetting  # noqa: F401 - registers table with Base.metadata
from app.models.audit_log import AuditLog  # noqa: F401 - registers table with Base.metadata
from app.models.document import Document  # noqa: F401 - registers table with Base.metadata
from app.models.setu import (  # noqa: F401 - registers the SetuDocs tables with Base.metadata
    BusinessProfile,
    Deadline,
    DocumentInsight,
    TimingTrial,
)
from app.models.user import User  # noqa: F401 - registers table with Base.metadata
from app.models.verification import (  # noqa: F401 - registers verification tables with Base.metadata
    ClaimContradiction,
    DocumentClaim,
    DocumentVerification,
    VerificationEvent,
)
from app.routers.analytics import router as analytics_router
from app.routers.audit import router as audit_router
from app.routers.auth import router as auth_router
from app.routers.citizen import router as citizen_router
from app.routers.deadlines import router as deadlines_router
from app.routers.documents import router as documents_router
from app.routers.impact import router as impact_router
from app.routers.recovery import router as recovery_router
from app.routers.schemes import router as schemes_router
from app.routers.settings import router as settings_router
from app.routers.verification import router as verification_router
from app.services.seed import seed_default_users
from app.services.settings_service import seed_default_settings

logger = logging.getLogger("govdocs.main")

app = FastAPI(
    title=settings.APP_NAME,
    description="SetuDocs AI - paperwork, sorted. Built on the GovDocs AI document-intelligence foundation.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication endpoints are kept in their own router so future modules can
# reuse the current-user dependency without expanding this application module.
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(citizen_router)
app.include_router(analytics_router)
app.include_router(audit_router)
app.include_router(settings_router)
app.include_router(recovery_router)
app.include_router(verification_router)
# SetuDocs AI - the three features built on top of the GovDocs foundation.
app.include_router(deadlines_router)
app.include_router(schemes_router)
app.include_router(impact_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Phase 8 - security hardening: guarantee no raw traceback ever reaches a
    client (which can leak file paths/internals), while still logging the
    full detail server-side for debugging. Endpoints that already raise
    HTTPException are unaffected - only genuinely unhandled errors land here.
    """
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred."})


@app.on_event("startup")
def verify_database_on_startup() -> None:
    """
    Fails fast and loudly if the SQLite file can't be created/opened,
    instead of silently deferring the error to the first real request.
    """
    Base.metadata.create_all(bind=engine)
    ensure_ocr_text_column(engine)
    ensure_ai_metadata_columns(engine)
    ensure_ai_output_language_column(engine)
    ensure_search_indexes(engine)
    ensure_review_columns(engine)
    ensure_user_profile_columns(engine)
    ensure_document_provenance_columns(engine)
    ensure_verification_currency_columns(engine)
    ensure_deadline_edit_column(engine)
    seed_default_users()
    seed_default_settings()
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    print(f"[SetuDocs AI] Database connection verified -> {settings.DATABASE_URL}")
    # Model name and whether a key is set - never the key itself.
    key_state = "set" if settings.GEMINI_API_KEY else "NOT SET (AI extraction disabled)"
    print(f"[SetuDocs AI] Gemini model: {settings.GEMINI_MODEL} | API key: {key_state}")

    # "The Blackout" challenge: make sure a verified recovery snapshot always
    # exists so the Recovery Center is demo-ready from a cold start. Never
    # fatal - the app runs fine without it.
    try:
        from app.services import blackout

        if blackout.get_snapshot() is None:
            blackout.create_snapshot()
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[SetuDocs AI] baseline recovery snapshot skipped: {exc}")


@app.get("/api/health", tags=["health"])
def health_check(db: Session = Depends(get_db)):
    """
    Confirms three things at once, which is exactly what you want to see
    green before building any real module on top of this:
    1. The FastAPI server is up and responding.
    2. The database session dependency works.
    3. A real query against SQLite succeeds.
    """
    db.execute(text("SELECT 1"))
    # Phase 9 - this endpoint is intentionally unauthenticated (it's a basic
    # liveness probe), so it must not leak connection details - "connected"
    # is all a caller needs, unlike the raw database_url this used to return.
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "database": "connected",
    }


@app.get("/", tags=["health"])
def root():
    return {"message": "SetuDocs AI backend is running. See /docs for the API explorer."}
