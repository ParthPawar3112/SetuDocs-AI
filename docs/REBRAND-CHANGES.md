# SetuDocs AI rebrand - every old string that was replaced

User-facing text only. Role *values* sent to the API (`Admin`, `Officer`, `Citizen`), department values, localStorage keys
(`govdocs_*`, kept so existing sessions keep working) and API paths are unchanged. The language choice is stored under `setu_lang`.

SetuDocs AI is built on the GovDocs AI foundation. Internal identifiers that still carry the old name, none of them shown to users:
the default `govdocs.db` database file name, `govdocs.*` Python logger names, the `govdocs_*` browser-storage keys, and some code comments.

## Brand
| Where | Old | New |
|---|---|---|
| index.html `<title>` | GovDocs AI | SetuDocs AI \| Transforming Documents into Actionable Insights. |
| index.html description | GovDocs AI - Smart Digital Documentation System for Government Offices | SetuDocs AI turns scanned and photographed paperwork, in Marathi or English, into a searchable record that warns you before deadlines and shows the government schemes you qualify for. |
| Logo (`Logo.jsx`) | `<img src="/logo.png" alt="GovDocs AI logo">` (old PNG logo) | Single component that renders the SetuDocs AI logo kit from `public/brand/` (seal, mark and app-icon variants, light and reversed tones) |
| `public/` logo files | old `favicon.png`, `logo.png` | Logo kit in `public/brand/` (SVG + PNG, favicons, app icon) plus `public/favicon.ico`; the logo SVGs and the logo kit zip are also kept in `docs/brand/` |
| Sidebar header | GovDocs AI (+ PNG chip) | SetuDocs AI wordmark + mark |
| Loading screen | Verifying your session, please wait... | Getting your workspace ready… (with logo) |
| Footer | GovDocs AI · Smart Digital Documentation System · Built for the Smart Kopargaon Hackathon | SetuDocs AI · Transforming Documents into Actionable Insights. · Built for Pragyan 2K26 |

## Login / sign-up
| Old | New |
|---|---|
| GovDocs AI (brand text, 3 places) | SetuDocs AI logo / wordmark |
| Turn Government Documents Into Digital Intelligence. | Transforming Documents into Actionable Insights. |
| Digitize, understand, search, and manage government records with AI-powered document intelligence. | Upload any document, in Marathi or English. SetuDocs reads it, tracks your deadlines, and finds the schemes you qualify for. |
| AI-powered OCR / Intelligent metadata extraction / Natural-language document search / Secure document repository | Reads Marathi & English / Deadline alerts / Scheme matching / Private & secure |
| Built for smarter, faster, and more secure government offices. · Secure • AI Powered • Paperless | Row of three small SDG 8 / 9 / 16 badges ("Supports the UN Sustainable Development Goals"), original artwork rather than the UN's own icons |
| Mock card: "Government Document", "Municipal Property Certificate", tags "Municipal Dept." / "Certificate" / "96% confidence" | Animated preview: scanned doc → read fields → "Deadline in 12 days" → "You may qualify: PM SVANidhi" (captioned as an example) |
| Create Citizen Account | Create your account / Create account |
| Register to submit documents digitally and track their review status. | Keep your paperwork in one place, with deadline alerts and scheme matches. |
| Sign in to continue to your GovDocs AI workspace. | Sign in to see your documents and deadlines. |
| Secure access to GovDocs AI | Secure sign-in with role-based access. |
| placeholder "admin or officer" | Your username |
| Sign up as a Citizen | Create an account |
| Forgot password? / "Contact your system administrator to reset your password." | removed (it only revealed a note; there is no reset flow). "Remember me" kept - it really saves the username. |

## Dashboard and screens
| Old | New |
|---|---|
| Today's overview / Welcome back, {username} / "{n} pending approvals · {n} documents on file" | Date line + "Good morning/afternoon/evening, {name}" + "Everything due, matched and uploaded across your workspace." |
| Citizen Portal / Welcome, {name} | Date line + greeting |
| Citizen ID | Member ID |
| Citizen role label | Individual / Business owner (short: Business owner) |
| Officer role label | CA / CSC operator |
| Announcements: "Prototype development complete - GovDocs AI now includes AI-powered document processing…" | removed from the dashboard |
| About GovDocs AI card (government paper workflows…) | removed from the dashboard |
| System status / Quick actions / Recent activity "Document and approval activity will populate this timeline in upcoming phases." | Translated; stale "upcoming phases" line replaced with "Your sign-ins show up here." |
| Citizen upload: "Officer review - A government officer verifies it" | Review - Your CA or admin can check it |
| "Submitting a document here does not by itself constitute government approval - it enters a review workflow." | "Adding a document here does not by itself make it an official record - it enters your review workflow." |
| "Upload your document for digital processing and officer review…" | "Add a scan or photo. SetuDocs reads it, finds the dates that matter and checks which schemes you may qualify for." |
| Value-proposition card (Upload → OCR & AI Processing → Officer Review → Decision) | replaced by the upload strip + "Track status" card |
| Review queue: "documents uploaded by Officers" | "documents uploaded by your team" |
| Review modal: "(shown to the uploading Officer)" | "(shown to the person who uploaded it)" |
| Verification: "GovDocs AI does not…" | "SetuDocs AI does not…" |
| Documents table empty: Click "Upload document" to digitize your first record. | Illustrated empty state: "Add your first piece of paperwork and it becomes searchable, with its dates tracked." |
| Upload placeholder "e.g. Land Record - Kopargaon" | e.g. Shop licence 2026 |
| Access-restricted page: "Upload, browse, and manage digitized government records." etc. | "{Section} is for Admin accounts - This area is limited to Admin accounts…" |
| Citizen ID / role text on Profile | Member ID, plain-language role label |

## Backend (visible text only)
| Where | Old | New |
|---|---|---|
| PDF header (`export_service.py`) | GovDocs AI - Document Summary Report | SetuDocs AI - Document Summary Report; plus closing line "Generated by SetuDocs AI - Transforming Documents into Actionable Insights." |
| `APP_NAME` (FastAPI title, /api/health; default in `config.py`, listed in `.env.example`) | GovDocs AI | SetuDocs AI |
| FastAPI description (`main.py`) | GovDocs AI description | "SetuDocs AI - Transforming Documents into Actionable Insights. Built on the GovDocs AI document-intelligence foundation." |
| `frontend/package.json` name / description | `govdocs-ai-frontend` | `setudocs-ai-frontend`, "SetuDocs AI web client - Transforming Documents into Actionable Insights." |
| Startup log | `[GovDocs AI] baseline recovery snapshot skipped` | `[SetuDocs AI] …` |
| Verification messages | "No other stored government document corroborates the amounts claimed here." | "No other document in your workspace corroborates the amounts claimed here." |
| | "Evidence is drawn from the GovDocs repository only…" | "Evidence is drawn from your SetuDocs workspace only…" |
| | "Marked outdated by a government officer." / "A government officer marked this document…" / "Reviewed by a government officer…" | "…by a reviewer." |

## Left alone on purpose
* The eight department options (Revenue, Education, Health, Agriculture, Police, Municipal, Finance, General Administration) - they are validated by the backend.
* AI prompts in `ai_service.py` / `verification_service.py` still say "government document" (model instructions, not UI text).
* Scheme catalog text (names, benefits, steps) is data from `schemes.json`, shown as sent.
