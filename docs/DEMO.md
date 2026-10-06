# SetuDocs AI - demo guide

A script for showing the app live. Everything here matches the current code; see [README.md](../README.md) for setup.

## Before you start

1. Backend running on port **8080** and frontend on **5173** (see "Getting started" in the README).
2. `backend/.env` has a valid `GEMINI_API_KEY` (otherwise the AI step reports "not configured") and `OCR_LANGUAGE=eng+mar` with `mar.traineddata` installed (otherwise Marathi text will not be read).
3. Two or three sample documents ready on the demo machine, as PDF, JPG or PNG under 10 MB: ideally one Marathi and one English (for example a shop licence, an Udyam certificate, an insurance policy) with a validity or renewal date on them. Photos of people or scenery are rejected by the document check, by design. No sample files ship with the repo.
4. Test the upload once beforehand, so the first OCR run is not on stage.

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
| 2 | Click **मराठी** in the top bar, then back to **EN** | The whole interface switches; the choice is remembered |
| 3 | Upload a scan or photo | The document check runs first, then OCR, then Gemini extraction; the status updates as it goes |
| 4 | Open the document | Extracted text, AI title, summary, category, keywords, confidence; the original file next to it |
| 5 | Open **Deadline Guard** | Dates found in the document, sorted as overdue / critical (0-7 days) / soon (8-30) / upcoming; you can add your own |
| 6 | Open **Scheme Matcher**, fill in the business profile, save | Likely vs. possible schemes, readiness %, documents you have and the ones still missing, link to the official portal. Say that it is guidance, not a decision |
| 7 | Open **Impact** | Counts are measured from the records. Time saved is labelled **Estimate** until at least three stopwatch trials exist for both methods |
| 8 | Sign out, sign in as `admin` | **Review Queue**: approve the upload. **Trust & Verification**: seed the demo scenario (below) and open a document. **Smart Search**: search for a word from one of your documents, then try it with a misspelling (rehearse the exact example first; the fuzzy fallback only runs when the exact search finds nothing). **Recovery Center**: run the simulation |

## Trust & Verification scenario (Admin)

In **Trust & Verification** use the demo button to seed six sample PM-KISAN documents: an official department circular, a forwarded WhatsApp message, an older 2022 circular, a district notice, an unsigned scan and a state press release. Open each one to show its trust score, band, classification, the claims it makes, and the contradictions with the other documents. Then record a reviewer decision to show that a human can override the machine. The same page has a button to remove the scenario again. The seeded text is fixed; this step needs no Gemini call.

## Recovery Center (Admin)

A **simulation**: it takes a verified snapshot, simulates an outage in which writes are suspended and queued, then recovers and reconciles. No real data is deleted. Use **Reset** to return to normal. Say plainly that it demonstrates the workflow and is not real backup infrastructure.

## Resetting between runs

- Remove just the trust scenario: the remove button in Trust & Verification.
- Clear the blackout simulation: **Reset** in the Recovery Center.
- Start from nothing: stop the backend, delete `backend/govdocs.db`, `backend/recovery/` and the files in `backend/uploads/` (keep `.gitkeep`), then start the backend again. The three demo accounts are recreated.

## What not to claim

- Marathi-script search and OCR accuracy have not been tested, and no accuracy percentage has been measured.
- Time saved is an estimate, not a measurement, until real trials are recorded.
- Scheme matches are indicative; confirm on the official portal. SetuDocs AI does not apply for anything.
- Document text goes to Gemini, which is hosted outside India.
- The bilingual synonym search exists in code (`vault_service.py`) but is not connected to the app.
