# SetuDocs AI - demo guide

A script for showing the app live. Everything here matches the current code; see [README.md](../README.md) for setup.

## Before you start

1. `backend/.env` has a **real** `GEMINI_API_KEY` pasted after the `=` (an empty value reports "not configured"; any other value is treated as a real key, so a placeholder fails with "Gemini rejected the API key"). Check **Settings** (Admin) shows the key as configured, then do one upload.
2. Marathi: set `OCR_LANGUAGE=eng+mar` **and** install `mar.traineddata` (see "Marathi" below). Without the Marathi file, `eng+mar` does not fail: Tesseract quietly reads English only, so a Marathi document comes out wrong with no error.
3. Use the demo workspace below, so your normal data is never touched.
4. Test the upload once beforehand, so the first OCR run is not on stage.

## Demo workspace (seed, run, check)

The demo uses its own database (`backend/demo.db`) and upload folder (`backend/demo_uploads/`), never your normal `govdocs.db` / `uploads/`. The seed script refuses to run against anything whose name does not contain "demo".

```powershell
# 1. Reset and seed (backend must be STOPPED: it locks the database file). From backend/ with the venv active:
python scripts/seed_demo.py --reset

# 2. Start the backend on the demo data (port 8080) ...
$env:DATABASE_URL="sqlite:///./demo.db"; $env:UPLOAD_DIR="demo_uploads"
python -m uvicorn app.main:app --port 8080

# 3. ... and the frontend in a second terminal
cd frontend; npm run dev

# Optional smoke test of every role through the API (it changes data, so reset again afterwards):
python scripts/demo_check.py
python scripts/demo_check.py --timing 3      # time upload -> OCR -> AI, 3 runs
```

What the seed creates:
- the three accounts, and a business profile for each (micro enterprise, services, Maharashtra; stage, gender and category left blank on purpose, so the Scheme Matcher shows both **likely** and **possible** matches);
- five processed documents for `citizen_demo`, spread over the last two weeks, with deadlines in every Deadline Guard group (one overdue, one critical, two soon, one upcoming; the dates are relative to the day you seed) and two documents waiting in the Review Queue;
- the six-document "Bad Reading" trust scenario (Verified, Flagged, Needs review, Outdated, Corroborated);
- the sample photo for the live upload: `backend/demo_assets/trade_licence_sample.jpg`, a trade licence whose expiry is 21 days after the day you seed (so it lands in "soon"). Re-run the seed on the day of recording so the date stays in the 8-30 day window.

## Accounts

| Username | Role | Password |
|---|---|---|
| `admin` | Admin | `DEMO_ADMIN_PASSWORD` in `backend/.env` |
| `officer` | Officer (shown as CA / CSC operator) | `DEMO_OFFICER_PASSWORD` |
| `citizen_demo` | Citizen (shown as individual / business owner), Citizen ID CIT-000001 | `DEMO_CITIZEN_PASSWORD` |

Defaults are in [backend/.env.example](../backend/.env.example). Accounts are created on first start and never overwritten, so changing a variable later does not change an existing account.

## The 8-step flow (about 5 minutes)

| # | Do | What to point out |
|---|---|---|
| 1 | Sign in as `citizen_demo` (or create an account on the sign-up page) | The citizen sees a small, personal workspace: dashboard, My Documents, Upload, Deadline Guard, Scheme Matcher, Impact |
| 2 | Click **मराठी** in the top bar, then back to **EN** | The interface switches and the choice is remembered. Scheme descriptions, document titles and some auto-generated deadline labels stay in English: they are data, not interface text |
| 3 | **Upload Document**: choose the sample photo, type a title, set Department to Municipal | The document check runs first, then OCR, then Gemini extraction; the status updates by itself, no refresh |
| 4 | Open the document | The original file, its timeline, the AI title, summary, category and keywords, and the Verification & Trust panel (the trust score appears a few seconds after the AI step). Extracted text and confidence are staff-only: show them in step 8 |
| 5 | Open **Deadline Guard** | The licence's expiry in the "Soon" group, next to the seeded overdue / critical / upcoming ones; you can add your own |
| 6 | Open **Scheme Matcher** | Likely vs. possible schemes, readiness %, documents you have and the ones still missing, link to the official portal. Change a profile answer and save to show the matches update. Say that it is guidance, not a decision |
| 7 | Open **Impact** | Counts are measured from the records. Time saved is labelled **Estimate** until at least three stopwatch trials exist for both methods |
| 8 | Sign out, sign in as `officer`, then `admin` | Officer: **Smart Search** (the exact word, then a misspelling; rehearse the example, because the fuzzy fallback only runs when the exact search finds nothing), **Review Queue** (approve the upload), **Trust & Verification** (open one item, record a decision). Admin: **Impact**, **Analytics**, **Audit Logs**, then the Dashboard |

## Trust & Verification scenario

The seed already created the six sample PM-KISAN documents: an official department circular, a forwarded WhatsApp message, an older 2022 circular, a district notice, an unsigned scan and a state press release. Open one to show its trust score, band, classification, the claims it makes and the contradictions with the other documents, then record a reviewer decision to show that a human can override the machine. Admins can remove or re-seed the scenario with the buttons on that page. The seeded text is fixed; this step needs no Gemini call.

These six documents are all Agriculture / Circular, so on the Admin's **Analytics** screen "Most common department" reads Agriculture. If that matters for your take, show Analytics first and seed the scenario afterwards from the Trust & Verification page.

## Recovery Center (Admin)

A **simulation**: it takes a verified snapshot, simulates an outage in which writes are suspended and queued, then recovers and reconciles. No real data is deleted. Use **Reset Blackout Demo** to return to normal. Say plainly that it demonstrates the workflow and is not real backup infrastructure. It is not part of the 8-step flow.

## Marathi

Not part of the QA-verified flow until `mar` is installed and tested. Windows steps:

1. Download `mar.traineddata` from <https://github.com/tesseract-ocr/tessdata_fast> (file `mar.traineddata`).
2. Copy it into Tesseract's `tessdata` folder, normally `C:\Program Files\Tesseract-OCR\tessdata` (needs an administrator prompt). If you cannot write there: make a folder such as `C:\tessdata`, copy `eng.traineddata` and `mar.traineddata` into it, and set `TESSDATA_PREFIX=C:\tessdata` in `backend/.env`.
3. Check: `tesseract --list-langs` must list `mar`.
4. In `backend/.env` set `OCR_LANGUAGE=eng+mar`, restart the backend.
5. Test with a real Marathi scan: `python scripts/test_marathi_ocr.py path\to\scan.jpg`, then upload it and read the extracted text yourself. Until then, do not claim Marathi document reading.

## Resetting between runs

- Everything: stop the backend, `python scripts/seed_demo.py --reset`, start it again (commands above).
- Remove just the trust scenario: the remove button in Trust & Verification.
- Clear the blackout simulation: **Reset Blackout Demo** in the Recovery Center.

## What not to claim

- Marathi-script search and OCR accuracy have not been tested, and no accuracy percentage has been measured.
- Time saved is an estimate, not a measurement, until real trials are recorded.
- Scheme matches are indicative; confirm on the official portal. SetuDocs AI does not apply for anything.
- Document text goes to Gemini, which is hosted outside India.
- The bilingual synonym search exists in code (`vault_service.py`) but is not connected to the app.
- The PDF summary export is short, about one to two pages, not strictly one page.
