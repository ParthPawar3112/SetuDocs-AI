"""
API smoke test for the SetuDocs AI demo, per role. Prints PASS / FAIL (with a reason) per check
and exits non-zero if anything failed.

Run it against the DEMO workspace, with the backend already running (see scripts/seed_demo.py):

    python scripts/demo_check.py                 # all checks
    python scripts/demo_check.py --timing 3      # time upload -> OCR -> AI, 3 runs, then clean up

IMPORTANT: this script changes data. It uploads the sample photo, approves it, records a trust
decision, and registers a throw-away "lockout probe" account. Run it, then re-run
`python scripts/seed_demo.py --reset` (backend stopped) before recording, so the demo starts clean.

Needs the sample photo made by seed_demo.py (backend/demo_assets/trade_licence_sample.jpg) and a
valid GEMINI_API_KEY in backend/.env for the AI checks. Uses httpx (installed with google-genai).
"""
import argparse
import os
import sys
import time
import uuid
from pathlib import Path

import httpx

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.core.config import settings  # noqa: E402  (only for the demo-account passwords; never printed)

SAMPLE = BACKEND / "demo_assets" / "trade_licence_sample.jpg"
RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, reason: str = "") -> bool:
    RESULTS.append((name, ok, reason))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  - {reason}" if reason else ""))
    return ok


def section(title: str) -> None:
    print(f"\n== {title} ==")


class Api:
    def __init__(self, base_url: str) -> None:
        self.http = httpx.Client(base_url=base_url.rstrip("/") + "/api", timeout=60)
        self.token: str | None = None

    def login(self, username: str, password: str) -> httpx.Response:
        r = self.http.post("/auth/login", json={"username": username, "password": password})
        if r.status_code == 200:
            self.token = r.json()["access_token"]
        return r

    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        headers = kwargs.pop("headers", {})
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return self.http.request(method, path, headers=headers, **kwargs)

    def get(self, path: str, **kw) -> httpx.Response:
        return self.request("GET", path, **kw)

    def post(self, path: str, **kw) -> httpx.Response:
        return self.request("POST", path, **kw)


def detail(r: httpx.Response) -> str:
    try:
        return str(r.json().get("detail", r.text))[:160]
    except Exception:  # noqa: BLE001
        return r.text[:160]


def upload_sample(api: Api, title: str = "Trade Licence - Patil General Stores", department: str = "Municipal") -> httpx.Response:
    return api.post(
        "/documents/upload",
        data={"title": title, "department": department, "output_language": "english"},
        files={"file": (SAMPLE.name, SAMPLE.read_bytes(), "image/jpeg")},
    )


def wait_for_pipeline(api: Api, doc_id: int, timeout: float = 120.0, poll: float = 0.25) -> dict:
    """Poll until OCR and AI have both finished (completed or failed). Returns timings and the document."""
    start = time.monotonic()
    t_ocr = t_ai = None
    doc: dict = {}
    while time.monotonic() - start < timeout:
        r = api.get(f"/documents/{doc_id}")
        if r.status_code != 200:
            break
        doc = r.json()
        now = time.monotonic() - start
        if t_ocr is None and doc["ocr_status"] in ("completed", "failed"):
            t_ocr = now
        if doc["ocr_status"] == "failed" or doc["ai_status"] in ("completed", "failed"):
            t_ai = now
            break
        time.sleep(poll)
    return {"doc": doc, "ocr_seconds": t_ocr, "ai_seconds": t_ai, "timed_out": t_ai is None}


# --------------------------------------------------------------------------- #
def run_timing(base: str, runs: int) -> None:
    section(f"Timing: upload -> OCR -> AI, {runs} runs")
    cit, off = Api(base), Api(base)
    cit.login("citizen_demo", settings.DEMO_CITIZEN_PASSWORD)
    off.login("officer", settings.DEMO_OFFICER_PASSWORD)
    rows = []
    for i in range(1, runs + 1):
        t0 = time.monotonic()
        r = upload_sample(cit, title=f"Timing run {i}")
        t_upload = time.monotonic() - t0
        if r.status_code != 201:
            print(f"  run {i}: upload failed {r.status_code} {detail(r)}")
            continue
        doc_id = r.json()["id"]
        t1 = time.monotonic()
        result = wait_for_pipeline(cit, doc_id)
        total = time.monotonic() - t0
        doc = result["doc"]
        rows.append((t_upload, result["ocr_seconds"], result["ai_seconds"], total, doc.get("ai_status"), doc.get("ocr_status")))
        print(
            f"  run {i}: upload response {t_upload:.2f}s | OCR done +{(result['ocr_seconds'] or 0):.2f}s | "
            f"AI done +{(result['ai_seconds'] or 0):.2f}s | end-to-end {total:.2f}s | ocr={doc.get('ocr_status')} ai={doc.get('ai_status')}"
        )
        if doc.get("ai_error"):
            print(f"         ai_error: {doc['ai_error'][:140]}")
        off.request("DELETE", f"/documents/{doc_id}")  # clean up the timing document
    if rows:
        print(f"  average end-to-end: {sum(r[3] for r in rows) / len(rows):.2f}s")


def run_checks(base: str) -> None:
    admin, officer, citizen = Api(base), Api(base), Api(base)

    section("Server")
    try:
        r = httpx.get(base.rstrip("/") + "/api/health", timeout=10)
        check("health endpoint", r.status_code == 200 and r.json().get("status") == "ok", f"HTTP {r.status_code}")
    except Exception as exc:  # noqa: BLE001
        check("health endpoint", False, f"cannot reach {base}: {exc}")
        return
    if not SAMPLE.exists():
        check("sample photo exists", False, f"{SAMPLE} missing - run scripts/seed_demo.py first")
        return

    # admin session is used early to find a document the citizen does not own
    ra = admin.login("admin", settings.DEMO_ADMIN_PASSWORD)
    check("admin login", ra.status_code == 200, f"HTTP {ra.status_code} {detail(ra) if ra.status_code != 200 else ''}".strip())
    foreign_id = None
    if ra.status_code == 200:
        listing = admin.get("/documents", params={"uploaded_by": "admin", "limit": 1})
        if listing.status_code == 200 and listing.json()["items"]:
            foreign_id = listing.json()["items"][0]["id"]

    # ------------------------------------------------------------------ Citizen
    section("Citizen (citizen_demo)")
    r = citizen.login("citizen_demo", settings.DEMO_CITIZEN_PASSWORD)
    if not check("login", r.status_code == 200, f"HTTP {r.status_code} {detail(r) if r.status_code != 200 else ''}".strip()):
        return
    r = citizen.get("/citizen/dashboard")
    check("dashboard loads", r.status_code == 200, f"HTTP {r.status_code}")

    r = upload_sample(citizen)
    uploaded = r.status_code == 201
    check("upload sample photo", uploaded, f"HTTP {r.status_code} {detail(r) if not uploaded else ''}".strip())
    doc_id = r.json()["id"] if uploaded else None
    doc: dict = {}
    if doc_id:
        result = wait_for_pipeline(citizen, doc_id)
        doc = result["doc"]
        check("OCR completes", doc.get("ocr_status") == "completed",
              f"ocr_status={doc.get('ocr_status')} in {result['ocr_seconds'] or 0:.1f}s; {doc.get('ocr_error') or ''}".strip(" ;"))
        ai_ok = doc.get("ai_status") == "completed"
        check("AI extraction completes", ai_ok,
              f"ai_status={doc.get('ai_status')} in {result['ai_seconds'] or 0:.1f}s" + (f"; {str(doc.get('ai_error'))[:150]}" if not ai_ok else ""))
        missing = [f for f in ("ai_title", "ai_summary", "ai_category", "ai_keywords") if not doc.get(f)]
        if doc.get("ai_confidence") is None:
            missing.append("ai_confidence")
        check("document has title, summary, category, keywords, confidence", not missing,
              f"missing: {', '.join(missing)}" if missing else f"confidence {doc.get('ai_confidence')}")

        dl = citizen.get("/deadlines", params={"status": "open"})
        mine = [d for d in dl.json()["items"] if d["document_id"] == doc_id] if dl.status_code == 200 else []
        check("a deadline was created from the uploaded document", bool(mine),
              f"{mine[0]['label']} due {mine[0]['due_date']} ({mine[0]['urgency']})" if mine else f"HTTP {dl.status_code}, none linked to document {doc_id}")

    dl = citizen.get("/deadlines", params={"status": "open"})
    if dl.status_code == 200:
        summary = dl.json()["summary"]
        empty = [g for g in ("overdue", "critical", "soon", "upcoming") if summary.get(g, 0) < 1]
        check("deadlines endpoint returns all four groups", not empty,
              f"empty groups: {', '.join(empty)}" if empty else
              f"overdue {summary['overdue']}, critical {summary['critical']}, soon {summary['soon']}, upcoming {summary['upcoming']}")
    else:
        check("deadlines endpoint returns all four groups", False, f"HTTP {dl.status_code}")

    r = citizen.get("/schemes/matches")
    if r.status_code == 200:
        schemes = r.json()["schemes"]
        kinds = {s["match"] for s in schemes}
        bad = [s["id"] for s in schemes if s["match"] not in ("likely", "possible") or s.get("readiness_percent") is None]
        has_missing = any(not d["have"] for s in schemes for d in s["required_docs"])
        check("scheme matches: likely/possible with readiness and missing documents",
              bool(schemes) and not bad and has_missing,
              f"{len(schemes)} schemes, kinds={sorted(kinds)}, missing docs listed={has_missing}")
        check("scheme matches include both likely and possible", {"likely", "possible"} <= kinds, f"kinds={sorted(kinds)}")
    else:
        check("scheme matches: likely/possible with readiness and missing documents", False, f"HTTP {r.status_code}")

    r = citizen.get("/impact")
    check("impact loads", r.status_code == 200 and "time" in r.json(), f"HTTP {r.status_code}")

    if foreign_id:
        r1 = citizen.get(f"/documents/{foreign_id}")
        r2 = citizen.get(f"/documents/download/{foreign_id}")
        check("cannot open another user's document (404)", r1.status_code == 404 and r2.status_code == 404,
              f"view HTTP {r1.status_code}, download HTTP {r2.status_code}")
    else:
        check("cannot open another user's document (404)", False, "no admin-owned document to test against")
    for path in ("/documents", "/analytics/summary", "/audit-logs", "/settings", "/recovery/status", "/verification/review-queue"):
        r = citizen.get(path)
        check(f"citizen blocked from {path} (403)", r.status_code == 403, f"HTTP {r.status_code}")

    # ------------------------------------------------------------------ Officer
    section("Officer")
    r = officer.login("officer", settings.DEMO_OFFICER_PASSWORD)
    if not check("login", r.status_code == 200, f"HTTP {r.status_code} {detail(r) if r.status_code != 200 else ''}".strip()):
        return
    word, typo = "grocery", "grocry"
    r = officer.get("/documents", params={"q": word})
    ids = [d["id"] for d in r.json()["items"]] if r.status_code == 200 else []
    check(f"Smart Search finds the uploaded document by a content word ('{word}')", bool(doc_id) and doc_id in ids,
          f"HTTP {r.status_code}, {len(ids)} result(s)")
    r = officer.get("/documents", params={"q": typo})
    ids = [d["id"] for d in r.json()["items"]] if r.status_code == 200 else []
    check(f"Smart Search finds it with a typo ('{typo}')", bool(doc_id) and doc_id in ids, f"HTTP {r.status_code}, {len(ids)} result(s)")

    r = officer.get("/documents", params={"status": "Pending"})
    pending = [d["id"] for d in r.json()["items"]] if r.status_code == 200 else []
    check("Review Queue loads and holds the uploaded document", bool(doc_id) and doc_id in pending,
          f"HTTP {r.status_code}, {len(pending)} pending")

    r = officer.get("/verification/review-queue")
    queue = r.json() if r.status_code == 200 else []
    check("Trust & Verification queue loads with Needs review / Flagged items",
          any(i["status"] in ("NEEDS_REVIEW", "FLAGGED") for i in queue), f"HTTP {r.status_code}, {len(queue)} item(s)")
    if queue:
        item = queue[0]
        p = officer.get(f"/verification/{item['document_id']}")
        body = p.json() if p.status_code == 200 else {}
        ok = p.status_code == 200 and body.get("trust_score") is not None and body.get("trust_band") and body.get("status") and isinstance(body.get("claims"), list)
        check("trust detail shows score, band, status and claims", ok,
              f"score={body.get('trust_score')} band={body.get('trust_band')} status={body.get('status')} claims={len(body.get('claims') or [])}")
    if doc_id:
        # The trust step runs in the background after AI finishes (it makes its own Gemini call), so wait for it.
        waited, body, p = 0.0, {}, None
        while waited < 90:
            p = officer.get(f"/verification/{doc_id}")
            body = p.json() if p.status_code == 200 else {}
            if body.get("trust_score") is not None:
                break
            time.sleep(1)
            waited += 1
        check("the uploaded document gets a trust assessment", p.status_code == 200 and body.get("trust_score") is not None,
              f"HTTP {p.status_code}, score={body.get('trust_score')}, band={body.get('trust_band')}, status={body.get('status')}, after {waited:.0f}s")
        r1 = officer.post(f"/documents/{doc_id}/review", json={"action": "approve", "remarks": "Checked against the original."})
        check("Review Queue: approve the document", r1.status_code == 200 and r1.json()["status"] == "Approved", f"HTTP {r1.status_code} {detail(r1) if r1.status_code != 200 else ''}".strip())
        r2 = officer.post(f"/verification/{doc_id}/review-decision", json={"decision": "verified", "reason": "Matches the original licence."})
        check("Trust & Verification: record a review decision", r2.status_code == 200, f"HTTP {r2.status_code} {detail(r2) if r2.status_code != 200 else ''}".strip())
    for path in ("/analytics/summary", "/audit-logs", "/settings", "/recovery/status"):
        r = officer.get(path)
        check(f"officer blocked from {path} (403)", r.status_code == 403, f"HTTP {r.status_code}")

    # -------------------------------------------------------------------- Admin
    section("Admin")
    r = admin.get("/impact")
    j = r.json() if r.status_code == 200 else {}
    check("impact loads (workspace scope, time saved is an estimate)", r.status_code == 200 and j.get("scope") == "workspace" and "minutes_saved_estimate" in j.get("time", {}),
          f"HTTP {r.status_code}, basis={j.get('time', {}).get('basis')}")
    for path in ("/analytics/summary", "/analytics/uploads-over-time", "/analytics/departments", "/analytics/categories"):
        r = admin.get(path)
        check(f"analytics {path}", r.status_code == 200 and bool(r.json()), f"HTTP {r.status_code}")
    if doc_id:
        r = admin.get("/audit-logs", params={"document_id": doc_id, "page_size": 100})
        actions = {e["action"] for e in r.json()["items"]} if r.status_code == 200 else set()
        wanted = {"Upload", "OCR Started", "OCR Completed", "AI Completed", "Approved"}
        check("audit log shows upload, OCR, AI and review actions", wanted <= actions,
              f"missing: {sorted(wanted - actions)}; seen: {sorted(actions)}" if not wanted <= actions else f"seen: {sorted(actions)}")
    r = admin.get("/settings")
    check("settings load", r.status_code == 200 and "gemini_model" in r.json(), f"HTTP {r.status_code}")
    if doc_id:
        r = admin.get(f"/documents/{doc_id}/export/summary-pdf")
        opened = ""
        ok = r.status_code == 200 and r.content.startswith(b"%PDF")
        if ok:
            try:
                import fitz  # PyMuPDF

                pdf = fitz.open(stream=r.content, filetype="pdf")
                opened = f"{pdf.page_count} page(s), {len(pdf[0].get_text())} chars of text"
                ok = pdf.page_count >= 1
            except Exception as exc:  # noqa: BLE001
                ok, opened = False, f"does not open: {exc}"
        check("PDF export downloads and opens", ok, opened or f"HTTP {r.status_code}")

    # ----------------------------------------------------------------- Negative
    section("Negative cases")
    r = citizen.post("/documents/upload", data={"title": "fake", "department": "Municipal"},
                     files={"file": ("not_an_image.png", b"this is plain text, not a PNG file at all", "image/png")})
    check(".txt renamed to .png is rejected", r.status_code == 400, f"HTTP {r.status_code} {detail(r)}")
    big = b"\x89PNG\r\n\x1a\n" + b"0" * (settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024)
    r = citizen.post("/documents/upload", data={"title": "big", "department": "Municipal"},
                     files={"file": ("huge.png", big, "image/png")})
    check(f"file over {settings.MAX_UPLOAD_SIZE_MB} MB is rejected", r.status_code == 413, f"HTTP {r.status_code} {detail(r)}")

    probe, probe_pw = f"lockout_probe_{uuid.uuid4().hex[:6]}", "Probe-Pass-123"
    reg = httpx.post(base.rstrip("/") + "/api/auth/register", timeout=30, json={
        "full_name": "Lockout Probe", "username": probe, "password": probe_pw, "confirm_password": probe_pw})
    if check("register a throw-away probe account", reg.status_code == 201, f"HTTP {reg.status_code}"):
        statuses = [Api(base).login(probe, "wrong-password").status_code for _ in range(5)]
        check("5 wrong passwords are each rejected (401)", statuses == [401] * 5, f"{statuses}")
        locked = Api(base).login(probe, probe_pw)
        check("6th attempt, even with the RIGHT password, is locked out (429)", locked.status_code == 429, f"HTTP {locked.status_code} {detail(locked)}")
        other = Api(base).login("citizen_demo", settings.DEMO_CITIZEN_PASSWORD)
        check("other accounts are not affected by the lockout", other.status_code == 200, f"HTTP {other.status_code}")
        print("  note  lockout is in memory, per username, for 5 minutes; it also clears on a backend restart. Only the probe account was locked.")


def main() -> None:
    parser = argparse.ArgumentParser(description="SetuDocs AI demo smoke test")
    parser.add_argument("--base-url", default=os.environ.get("DEMO_BASE_URL", "http://127.0.0.1:8080"))
    parser.add_argument("--timing", type=int, metavar="N", help="only time N upload->OCR->AI runs, then delete them")
    args = parser.parse_args()

    print(f"SetuDocs AI demo check against {args.base_url}")
    if args.timing:
        run_timing(args.base_url, args.timing)
        return
    run_checks(args.base_url)

    failed = [r for r in RESULTS if not r[1]]
    print(f"\n{len(RESULTS) - len(failed)} passed, {len(failed)} failed")
    for name, _, reason in failed:
        print(f"  FAILED: {name} - {reason}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
