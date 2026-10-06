"""
Reset and seed the DEMO workspace used for recording the SetuDocs AI demo.

It writes to a separate demo database (backend/demo.db) and upload folder
(backend/demo_uploads/) - never to your normal govdocs.db / uploads/. The script
refuses to run if DATABASE_URL does not point at a "demo" database file.

What it creates
  * the three demo accounts (admin, officer, citizen_demo) via the normal startup seeding
  * the Citizen's business profile (micro enterprise, services, Maharashtra; stage/gender/category left blank
    on purpose so the Scheme Matcher shows both likely and possible matches)
  * five processed documents for citizen_demo, with deadlines in every Deadline Guard group
    (overdue, critical 0-7 days, soon 8-30 days, upcoming) and two documents waiting in the Review Queue
  * the six-document "Bad Reading" scenario (Trust & Verification: Verified / Flagged / Needs review / Outdated)
  * backend/demo_assets/trade_licence_sample.jpg - a sample photo for the LIVE upload, with an
    expiry date 21 days from today

Usage (from backend/, venv active, backend server STOPPED because it locks the SQLite file):
    python scripts/seed_demo.py --reset

Then start the backend against the demo data:
    $env:DATABASE_URL="sqlite:///./demo.db"; $env:UPLOAD_DIR="demo_uploads"
    python -m uvicorn app.main:app --port 8080
"""
import argparse
import os
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
os.chdir(BACKEND)
sys.path.insert(0, str(BACKEND))

# Demo-only storage, unless the caller already chose something. Must happen before
# app.core.config is imported (environment variables beat backend/.env).
os.environ.setdefault("DATABASE_URL", "sqlite:///./demo.db")
os.environ.setdefault("UPLOAD_DIR", "demo_uploads")

from app.core.config import settings  # noqa: E402

ASSET_DIR = BACKEND / "demo_assets"
SAMPLE_PATH = ASSET_DIR / "trade_licence_sample.jpg"
SAMPLE_EXPIRY_DAYS = 21  # lands in the "soon" group (8-30 days)


def _db_file() -> Path | None:
    prefix = "sqlite:///"
    if not settings.DATABASE_URL.startswith(prefix):
        return None
    return (BACKEND / settings.DATABASE_URL[len(prefix):]).resolve()


def _guard_demo_target() -> Path:
    db_file = _db_file()
    if db_file is None or "demo" not in db_file.name.lower():
        sys.exit(
            f"Refusing to run: DATABASE_URL={settings.DATABASE_URL!r} is not a demo database "
            "(file name must contain 'demo'). This script wipes its target with --reset."
        )
    upload_dir = (BACKEND / settings.UPLOAD_DIR).resolve()
    if "demo" not in upload_dir.name.lower():
        sys.exit(f"Refusing to run: UPLOAD_DIR={settings.UPLOAD_DIR!r} is not a demo folder (name must contain 'demo').")
    return db_file


def _fmt(d: date) -> str:
    return d.strftime("%d/%m/%Y")


def make_sample_photo(today: date) -> Path:
    """A phone-photo-style trade licence: paper on a desk, slight tilt, noise, soft blur."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont

    expiry = today + timedelta(days=SAMPLE_EXPIRY_DAYS)
    lines = [
        ("MUNICIPAL COUNCIL, KOPARGAON", 38, True),
        ("TRADE LICENCE", 46, True),
        ("", 20, False),
        ("Licence No: TL/2025/04817", 30, False),
        ("Name of Business: Patil General Stores", 30, False),
        ("Proprietor: Ramesh Patil", 30, False),
        ("Address: Station Road, Kopargaon", 30, False),
        ("Nature of Business: Retail - grocery", 30, False),
        ("Date of issue: 12/11/2025", 30, False),
        (f"Valid until: {_fmt(expiry)}", 34, True),
        ("", 20, False),
        ("This licence must be renewed before the date of expiry.", 26, False),
        ("Renewal after the expiry date attracts a penalty.", 26, False),
    ]

    def font(size: int, bold: bool):
        for name in ("arialbd.ttf" if bold else "arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"):
            try:
                return ImageFont.truetype(name, size)
            except OSError:
                continue
        return ImageFont.load_default()

    paper_w, paper_h = 1100, 900
    paper = Image.new("RGB", (paper_w, paper_h), (250, 247, 238))
    draw = ImageDraw.Draw(paper)
    draw.rectangle([18, 18, paper_w - 18, paper_h - 18], outline=(60, 60, 60), width=4)
    y = 60
    for text, size, bold in lines:
        if text:
            draw.text((70, y), text, fill=(25, 25, 35), font=font(size, bold))
        y += size + 22

    desk = Image.new("RGB", (1400, 1150), (118, 92, 70))
    ddraw = ImageDraw.Draw(desk)
    rnd = random.Random(7)
    for _ in range(260):  # faint wood-grain streaks
        x, yy = rnd.randint(0, 1400), rnd.randint(0, 1150)
        ddraw.line([(x, yy), (x + rnd.randint(60, 240), yy + rnd.randint(-3, 3))], fill=(104, 80, 60), width=2)
    tilted = paper.rotate(1.2, expand=True, resample=Image.BICUBIC, fillcolor=(118, 92, 70))
    desk.paste(tilted, ((1400 - tilted.width) // 2, (1150 - tilted.height) // 2))

    px = desk.load()
    for _ in range(40000):  # light sensor noise
        x, yy = rnd.randint(0, desk.width - 1), rnd.randint(0, desk.height - 1)
        r, g, b = px[x, yy]
        n = rnd.randint(-14, 14)
        px[x, yy] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    desk = desk.filter(ImageFilter.GaussianBlur(0.6))

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    desk.save(SAMPLE_PATH, format="JPEG", quality=88)
    return SAMPLE_PATH


def _documents(today: date) -> list[dict]:
    """Five processed documents for the Citizen. Dates are relative to today so every
    Deadline Guard group is filled no matter when the script runs."""
    d = lambda n: _fmt(today + timedelta(days=n))  # noqa: E731
    return [
        {
            "title": "Shop & Establishment Licence - Patil General Stores",
            "days_ago": 12,
            "department": "Municipal",
            "status": "Approved",
            "text": (
                "GOVERNMENT OF MAHARASHTRA\nCERTIFICATE OF REGISTRATION\n"
                "Under the Maharashtra Shops and Establishments Act\n"
                "Registration No: 2025/KOP/11873\nName of Establishment: Patil General Stores\n"
                f"Renewal due on {d(-6)}\nRenew the registration before this date to avoid a penalty."
            ),
            "ai": ("Shop & Establishment Registration", "Registration of Patil General Stores under the Maharashtra "
                   "Shops and Establishments Act. It must be renewed by the stated date.", "Certificate",
                   ["shop act", "registration", "renewal", "Kopargaon"], 91.0),
        },
        {
            "title": "FSSAI Food Licence - Patil General Stores",
            "days_ago": 5,
            "department": "Health",
            "status": "Pending",
            "text": (
                "FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA\nFSSAI Licence\n"
                "Licence No: 21525012000417\nFood Business Operator: Patil General Stores\n"
                f"Licence valid until {d(4)}\nApply for renewal before the expiry date."
            ),
            "ai": ("FSSAI Food Licence", "Food business licence for a general store, valid until the date shown.",
                   "Licence", ["FSSAI", "food licence", "expiry"], 89.0),
        },
        {
            "title": "Shop Insurance Policy 2026",
            "days_ago": 3,
            "department": "Finance",
            "status": "Pending",
            "text": (
                "SHOP PACKAGE INSURANCE POLICY\nPolicy No: SP/2026/0098123\nInsured: Patil General Stores\n"
                "Sum insured: Rs 5,00,000 (fire and burglary)\n"
                f"Policy valid till {d(19)}\nPremium paid: Rs 6,430"
            ),
            "ai": ("Shop Insurance Policy", "Fire and burglary cover of Rs 5 lakh for the shop. The policy must be "
                   "renewed when it ends.", "Insurance", ["insurance", "policy", "fire", "renewal"], 86.0),
        },
        {
            "title": "Udyam Registration Certificate",
            "days_ago": 9,
            "department": "General Administration",
            "status": "Approved",
            "text": (
                "UDYAM REGISTRATION CERTIFICATE\nMinistry of Micro, Small and Medium Enterprises\n"
                "Udyam Registration Number: UDYAM-MH-18-0012345\nName of Enterprise: Patil General Stores\n"
                "Type of Enterprise: Micro\nMajor Activity: Trading"
            ),
            "ai": ("Udyam Registration Certificate", "Udyam registration confirming Patil General Stores as a micro "
                   "enterprise.", "Certificate", ["Udyam", "MSME", "registration"], 93.0),
        },
        {
            "title": "Business Loan Sanction Letter",
            "days_ago": 7,
            "department": "Finance",
            "status": "Approved",
            "text": (
                "BANK OF MAHARASHTRA - SANCTION LETTER\nBorrower: Patil General Stores\n"
                "Loan amount sanctioned: Rs 3,00,000 (working capital)\n"
                f"Next instalment due on {d(62)}\nPlease pay on or before the due date to avoid a late fee."
            ),
            "ai": ("Business Loan Sanction Letter", "Working-capital loan of Rs 3 lakh sanctioned to the shop, with "
                   "the next instalment due on the date shown.", "Letter", ["loan", "sanction", "instalment"], 84.0),
        },
    ]


def seed(today: date) -> None:
    from app.db.database import SessionLocal
    from app.main import verify_database_on_startup
    from app.models.document import Document
    from app.models.user import User
    from app.routers import verification as verification_router
    from app.routers.verification import _render_text_png
    from app.services import audit_service, file_storage, scheme_service, verification_service
    from app.services.setu_pipeline import process_document_insights

    verify_database_on_startup()  # creates tables + the three demo accounts + default settings

    db = SessionLocal()
    try:
        citizen = db.query(User).filter(User.username == "citizen_demo").first()
        admin = db.query(User).filter(User.username == "admin").first()
        if citizen is None or admin is None:
            sys.exit("Demo accounts were not created - check the backend startup output above.")

        # Business stage, gender and category are deliberately left blank ("not sure"), so the
        # Scheme Matcher shows BOTH likely matches and possible ones (PMEGP, Stand-Up India)
        # together with the answers that would settle them. Admin and Officer get the same profile
        # so their Impact / Scheme Matcher screens are not empty when filmed.
        profile = {"entity_type": "micro_enterprise", "business_stage": None, "sector": "services",
                   "state": "Maharashtra", "gender": None, "social_category": None}
        for username in ("citizen_demo", "officer", "admin"):
            scheme_service.save_profile(db, username, dict(profile))
        print("  business profile saved for citizen_demo, officer, admin (stage, gender, category left blank on purpose)")

        for spec in _documents(today):
            png = _render_text_png(spec["text"])
            stored, path = file_storage.save_file(png, "png")
            ai_title, ai_summary, ai_category, ai_keywords, ai_conf = spec["ai"]
            document = Document(
                title=spec["title"], department=spec["department"],
                description="Demo document.", original_filename=spec["title"].replace(" ", "_") + ".png",
                filename=stored, filepath=path, filesize=len(png), filetype="png",
                uploaded_by="citizen_demo", status=spec["status"], ocr_text=spec["text"],
                ai_title=ai_title, ai_summary=ai_summary, ai_department=spec["department"],
                ai_category=ai_category, ai_keywords=ai_keywords, ai_confidence=ai_conf,
                ai_processed=True, ai_output_language="english",
                file_sha256=verification_service.sha256_of(png),
                # Spread over the last two weeks so the timeline charts are not a single spike.
                upload_date=datetime.now(timezone.utc) - timedelta(days=spec["days_ago"], minutes=random.randint(0, 600)),
            )
            if spec["status"] == "Approved":
                document.reviewed_by, document.admin_remarks = "officer", "Checked against the original."
            db.add(document)
            db.commit()
            db.refresh(document)
            audit_service.log_action(db, user="citizen_demo", action="Upload", document_id=document.id,
                                     details=spec["title"])
            insight = process_document_insights(document.id)
            print(f"  document {document.id}: {spec['title']} [{spec['status']}] -> {insight}")

        # Trust & Verification scenario (the same code the Admin's demo button runs).
        result = verification_router.demo_seed(current_user=admin, db=db)
        print(f"  trust scenario: {len(result['seeded'])} documents")
        for item, days_ago in zip(result["seeded"], (8, 4, 11, 6, 2, 9)):
            doc = db.get(Document, item["document_id"])
            doc.upload_date = datetime.now(timezone.utc) - timedelta(days=days_ago, minutes=random.randint(0, 600))
            print(f"    - {item.get('status')}  score={item.get('trust_score')}  {item['title']}")
        db.commit()
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset and seed the demo workspace.")
    parser.add_argument("--reset", action="store_true", help="delete the demo database and demo uploads first")
    args = parser.parse_args()

    db_file = _guard_demo_target()
    upload_dir = (BACKEND / settings.UPLOAD_DIR).resolve()
    print(f"Demo database : {db_file}")
    print(f"Demo uploads  : {upload_dir}")

    if args.reset:
        if db_file.exists():
            try:
                db_file.unlink()
            except PermissionError:
                sys.exit("Could not delete the demo database - stop the backend server first.")
        if upload_dir.exists():
            for item in upload_dir.iterdir():
                if item.is_file():
                    item.unlink()
        print("Reset: demo database and demo uploads cleared.")
    elif db_file.exists():
        print("Note: the demo database already exists; use --reset for a clean seed (otherwise documents are added again).")

    from app.services.deadline_service import today_ist  # the app's own "today" (IST)

    today = today_ist()
    print("Seeding ...")
    seed(today)
    sample = make_sample_photo(today)
    print(f"Sample photo for the live upload: {sample}  (expiry {_fmt(today + timedelta(days=SAMPLE_EXPIRY_DAYS))})")
    print("Done. Start the backend with DATABASE_URL=sqlite:///./demo.db and UPLOAD_DIR=demo_uploads.")


if __name__ == "__main__":
    main()
