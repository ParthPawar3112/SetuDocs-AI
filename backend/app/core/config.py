"""
Centralized application configuration.

Reads values from a .env file (see .env.example) using pydantic-settings.
Every setting defined here is documented in backend/.env.example.
"""
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Development-only fallbacks. With ENV=production the app refuses to start
# while any of these is still in use (see Settings.refuse_default_secrets_in_production).
DEFAULT_JWT_SECRET = "change-this-development-secret-before-production"
DEFAULT_DEMO_ADMIN_PASSWORD = "admin123"
DEFAULT_DEMO_OFFICER_PASSWORD = "officer123"
DEFAULT_DEMO_CITIZEN_PASSWORD = "citizen123"


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "SetuDocs AI"
    ENV: str = "development"

    # --- Database (SQLite for the hackathon MVP) ---
    # A relative sqlite file is created automatically on first run.
    DATABASE_URL: str = "sqlite:///./govdocs.db"

    # --- CORS ---
    # Vite's default dev server port.
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # --- Authentication ---
    # This value is supplied through .env and signs short-lived access tokens.
    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Demo accounts ---
    # Passwords for the accounts seeded on first start (admin, officer,
    # citizen_demo). The defaults are public knowledge - fine for a local demo,
    # never for a real deployment. Existing accounts are never overwritten.
    DEMO_ADMIN_PASSWORD: str = DEFAULT_DEMO_ADMIN_PASSWORD
    DEMO_OFFICER_PASSWORD: str = DEFAULT_DEMO_OFFICER_PASSWORD
    DEMO_CITIZEN_PASSWORD: str = DEFAULT_DEMO_CITIZEN_PASSWORD

    # --- Document storage (Phase 4) ---
    # Relative to the backend/ working directory, matching where uvicorn runs from.
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # --- OCR (Phase 5) ---
    # "tesseract" is the default: a thin wrapper around the Tesseract binary,
    # no heavy ML dependencies, and reliably installable on Windows even with
    # newer Python versions. "easyocr" is supported and fully implemented,
    # but depends on PyTorch (multi-GB, sometimes lacks Windows wheels for
    # brand-new Python releases) - switch to it by changing this one value
    # once torch is confirmed working in your environment, no code changes
    # needed. See README "OCR Engine" section for the Windows Tesseract setup.
    OCR_ENGINE: str = "tesseract"
    # Only needed on Windows if `tesseract` isn't on PATH, e.g.:
    # r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    TESSERACT_CMD: str | None = None
    # Tesseract language(s) to recognize, in Tesseract's own "+"-joined format
    # (e.g. "eng", "mar", "eng+mar"). Defaults to eng+mar so a single OCR pass
    # picks up both scripts on government documents that mix English and
    # Marathi on the same page. Requires the matching .traineddata file(s) to
    # be installed in Tesseract's tessdata directory - see README.
    OCR_LANGUAGE: str = "eng+mar"
    # Only needed if language packs (e.g. mar.traineddata) live outside
    # Tesseract's own tessdata folder - e.g. C:\HACAKATHON\tessdata when
    # Program Files isn't writable without elevation. If set, ocr_service
    # applies this to the process's own environment before every OCR call,
    # so it's honored no matter how uvicorn happens to be launched (a fresh
    # terminal, VS Code, a double-clicked script) - it does not depend on
    # TESSDATA_PREFIX already being set in whatever shell started the app.
    TESSDATA_PREFIX: str | None = None

    # --- AI Metadata Extraction (Phase 6) ---
    # Required for Phase 6. Get a key at https://aistudio.google.com/apikey
    # Left empty by default so the app still runs without it - AI extraction
    # simply reports a clear "not configured" error instead of crashing.
    GEMINI_API_KEY: str = ""
    # Verified working with a live key on 2026-10-03. Gemini's model lineup
    # moves fast (gemini-2.5-flash already returns 404 for new keys) - if this
    # one is retired, set GEMINI_MODEL in backend/.env to a model your key can
    # use (client.models.list() shows them), no code changes needed.
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    # Default language for the AI-generated "title" and "summary" fields
    # ("english" | "marathi") when an upload doesn't specify one - see the
    # per-upload output_language form field on POST /documents/upload. This
    # is deliberately separate from OCR_LANGUAGE above: OCR_LANGUAGE controls
    # which scripts Tesseract recognizes in the source image (always eng+mar,
    # regardless of this setting), while this controls what language Gemini
    # writes its OUTPUT in. department/category/keywords always stay in
    # English regardless of this setting, so cross-document search/filtering
    # never fragments across languages. MUST default to "english" - existing
    # rows and callers that don't pass output_language rely on this.
    AI_OUTPUT_LANGUAGE: str = "english"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def refuse_default_secrets_in_production(self) -> "Settings":
        """With ENV=production, fail fast instead of running on public defaults."""
        if self.ENV.strip().lower() != "production":
            return self
        problems = []
        if self.JWT_SECRET_KEY == DEFAULT_JWT_SECRET:
            problems.append("JWT_SECRET_KEY")
        defaults = {
            "DEMO_ADMIN_PASSWORD": DEFAULT_DEMO_ADMIN_PASSWORD,
            "DEMO_OFFICER_PASSWORD": DEFAULT_DEMO_OFFICER_PASSWORD,
            "DEMO_CITIZEN_PASSWORD": DEFAULT_DEMO_CITIZEN_PASSWORD,
        }
        problems += [name for name, default in defaults.items() if getattr(self, name) == default]
        if problems:
            raise ValueError(
                "ENV=production but these settings still have their public default values: "
                + ", ".join(problems)
                + ". Set them in backend/.env (generate a secret with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))").'
            )
        return self


settings = Settings()
