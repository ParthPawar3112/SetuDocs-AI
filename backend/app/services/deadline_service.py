"""Deadline Guard - finds dates that matter in a document and tracks them.

Two sources feed it:
  * "auto": a deterministic pass over the OCR text. It looks for a date that
    sits next to wording like "valid till", "expires on" or "last date"
    (English and Marathi) and ignores dates that are merely issue dates or
    birth dates. This works with no API key and no quota.
  * "ai": the optional `dates` list Gemini returns in the same call that
    already extracts the title and summary (no extra API request).

Both are merged, de-duplicated by (date, kind) and stored as Deadline rows.
Re-processing a document never duplicates a row, never resurrects a deadline
the person already marked done, never overwrites a label or date the person
edited, and drops stale open rows that no longer appear in the text.

Dates are read day-first (31/12/2026), the convention on Indian documents.
"""
import logging
import re
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.setu import Deadline

logger = logging.getLogger("setudocs.deadlines")

IST = timezone(timedelta(hours=5, minutes=30))

KINDS = ("expiry", "renewal", "due", "other")
SOURCES = ("auto", "ai", "manual")
STATUSES = ("open", "done", "dismissed")

# Dates further back than this are treated as noise (old historical dates).
LOOKBACK_DAYS = 3 * 365
MIN_YEAR, MAX_YEAR = 2000, 2100

_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

_EN_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}
_MR_MONTHS = {
    "जानेवारी": 1, "फेब्रुवारी": 2, "मार्च": 3, "एप्रिल": 4, "मे": 5, "जून": 6,
    "जुलै": 7, "ऑगस्ट": 8, "सप्टेंबर": 9, "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12,
}

_EN_MONTH_RE = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
_MR_MONTH_RE = "(" + "|".join(sorted(_MR_MONTHS, key=len, reverse=True)) + ")"

# Each pattern yields (day, month, year) through the named groups below.
_DATE_PATTERNS = [
    re.compile(r"(?<!\d)(?P<d>\d{1,2})\s*[/\-.]\s*(?P<m>\d{1,2})\s*[/\-.]\s*(?P<y>\d{4})(?!\d)"),
    re.compile(r"(?<!\d)(?P<y>\d{4})\s*[/\-.]\s*(?P<m>\d{1,2})\s*[/\-.]\s*(?P<d>\d{1,2})(?!\d)"),
    re.compile(
        r"(?<!\d)(?P<d>\d{1,2})(?:st|nd|rd|th)?[\s\-]+(?P<mon>" + _EN_MONTH_RE + r")[a-z]*\.?[\s,\-]+(?P<y>\d{4})(?!\d)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?P<mon>" + _EN_MONTH_RE + r")[a-z]*\.?\s+(?P<d>\d{1,2})(?:st|nd|rd|th)?,?\s+(?P<y>\d{4})(?!\d)",
        re.IGNORECASE,
    ),
    re.compile(r"(?<!\d)(?P<d>\d{1,2})\s+(?P<mon>" + _MR_MONTH_RE + r")\s*,?\s*(?P<y>\d{4})(?!\d)"),
]

# (kind, label, phrases that appear BEFORE the date). Longest/most specific first.
_BEFORE_RULES = [
    ("renewal", "Renewal due", [
        "renewal due", "renew by", "renew before", "due for renewal", "next renewal", "renewal date",
        "renewal on", "renewal", "renew", "नूतनीकरण",
    ]),
    ("due", "Payment / filing due", [
        "due date", "due on", "due by", "last date", "last day", "pay by", "payable by", "pay before",
        "submit by", "file by", "filing date", "deadline", "next due", "premium due", "शेवटची तारीख",
        "भरण्याची", "देय",
    ]),
    ("expiry", "Valid until", [
        "valid till", "valid upto", "valid up to", "valid until", "valid through", "valid thru", "valid to",
        "validity", "expires on", "expires", "expiry date", "date of expiry", "expiry", "expiration",
        "expire on", "मुदत", "वैधता", "वैध",
    ]),
]
# Phrases that may FOLLOW the date, mainly Marathi ("31/12/2026 पर्यंत वैध").
_AFTER_RULES = [
    ("expiry", "Valid until", ["पर्यंत वैध", "पर्यंत", "पर्यन्त", "till date", "(expiry)"]),
]
# If one of these sits directly before the date, it is NOT an obligation.
_IGNORE_BEFORE = [
    "date of issue", "issued on", "issue date", "date of birth", "dob", "born on", "date of registration",
    "date of incorporation", "date of commencement", "date of allotment", "जन्म", "दिनांक", "dated",
    "date of application",
]

# "Valid from 01/01/2025 to 31/12/2026": the first date is a start, only the end
# date is the obligation. The cue in front of the start date decides the kind.
_RANGE_CUES = [
    "valid from", "validity", "period of validity", "validity period", "policy period",
    "insurance period", "coverage period",
]
_RANGE_CONNECTOR = r"(?:to|till|until|upto|up\s+to|through|thru|[-–—]|ते)"
_RANGE_BETWEEN = re.compile(r"\s*" + _RANGE_CONNECTOR + r"\s*", re.IGNORECASE)

BEFORE_WINDOW = 55
AFTER_WINDOW = 25


def today_ist() -> date:
    return datetime.now(IST).date()


def normalise_digits(text: str) -> str:
    return text.translate(_DEVANAGARI_DIGITS)


def _month_number(token: str) -> int | None:
    token = token.strip().lower().rstrip(".")
    if token in _MR_MONTHS:
        return _MR_MONTHS[token]
    return _EN_MONTHS.get(token[:4] if token.startswith("sept") else token[:3])


def _build_date(groups: dict) -> date | None:
    try:
        year = int(groups["y"])
        day = int(groups["d"])
        month = int(groups["m"]) if groups.get("m") else _month_number(groups["mon"])
        if month is None or not (MIN_YEAR <= year <= MAX_YEAR):
            return None
        return date(year, month, day)
    except (ValueError, TypeError, KeyError):
        return None


def _classify(before: str, after: str) -> tuple[str, str] | None:
    before_l = before.lower()
    after_l = after.lower()

    # An "issued on"/"date of birth" cue closest to the date wins over an older cue.
    nearest_ignore = max((before_l.rfind(p) for p in _IGNORE_BEFORE), default=-1)

    best: tuple[int, str, str] | None = None
    for kind, label, phrases in _BEFORE_RULES:
        for phrase in phrases:
            index = before_l.rfind(phrase)
            if index == -1:
                continue
            if nearest_ignore > index:
                continue  # the date is closer to an "issued on" style cue
            if best is None or index > best[0]:
                best = (index, kind, label)
    if best is not None:
        return best[1], best[2]

    # Trailing cues only count when they sit on the same line, right after this
    # date, and the date is not itself introduced by an "issued on" style cue -
    # otherwise an issue date on one line borrows the "पर्यंत" of the next.
    if nearest_ignore != -1 and len(before_l) - nearest_ignore <= 25:
        return None
    same_line_after = re.split(r"[\n\r]|\d{1,2}\s*[/\-.]\s*\d{1,2}\s*[/\-.]\s*\d{4}", after_l)[0]
    for kind, label, phrases in _AFTER_RULES:
        if any(p in same_line_after for p in phrases):
            return kind, label
    return None


def _last_date_match(window: str):
    """The date match in `window` that ends furthest to the right, or None."""
    return max(
        (m for p in _DATE_PATTERNS for m in p.finditer(window)),
        key=lambda m: m.end(),
        default=None,
    )


def _starts_range(before: str, after: str) -> bool:
    """True when this date is the start of a validity range ("valid from A to B")."""
    if not any(cue in before.lower() for cue in _RANGE_CUES):
        return False
    gap = _RANGE_BETWEEN.match(after)
    return bool(gap and any(p.match(after[gap.end():]) for p in _DATE_PATTERNS))


def extract_dates_from_text(text: str | None, today: date | None = None) -> list[dict]:
    """Return [{label, kind, due_date, evidence}] for obligation-style dates."""
    if not text or not text.strip():
        return []
    today = today or today_ist()
    earliest = today - timedelta(days=LOOKBACK_DAYS)
    normalised = normalise_digits(text)

    found: dict[tuple[date, str], dict] = {}
    for pattern in _DATE_PATTERNS:
        for match in pattern.finditer(normalised):
            due = _build_date(match.groupdict())
            if due is None or due < earliest:
                continue
            start, end = match.span()
            raw_before = normalised[max(0, start - BEFORE_WINDOW):start]
            if _starts_range(raw_before, normalised[end:end + 30]):
                continue  # start of "valid from A to B" - only B is the deadline
            # A cue only describes the date it sits next to, so ignore anything
            # up to and including an earlier date in the window.
            previous = _last_date_match(raw_before)
            before = raw_before[previous.end():] if previous else raw_before
            after = normalised[end:end + AFTER_WINDOW]
            if previous and _RANGE_BETWEEN.fullmatch(before):
                # End of a range: it takes the kind of the cue in front of the start date.
                cue = raw_before[:previous.start()]
                classified = (
                    ("expiry", "Valid until")
                    if any(c in cue.lower() for c in _RANGE_CUES)
                    else _classify(cue, "")
                )
            else:
                classified = _classify(before, after)
            if classified is None:
                continue
            kind, label = classified
            key = (due, kind)
            if key in found:
                continue
            evidence = re.sub(r"\s+", " ", normalised[max(0, start - 40):end + 15]).strip()
            found[key] = {"label": label, "kind": kind, "due_date": due, "evidence": evidence[:300]}

    return sorted(found.values(), key=lambda item: item["due_date"])


def parse_ai_dates(raw: object) -> list[dict]:
    """Validate the optional `dates` array from Gemini. Anything malformed is
    dropped silently - a bad date must never break metadata extraction."""
    if not isinstance(raw, list):
        return []
    today = today_ist()
    earliest = today - timedelta(days=LOOKBACK_DAYS)
    cleaned: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            due = datetime.strptime(str(item.get("date", "")).strip(), "%Y-%m-%d").date()
        except ValueError:
            continue
        if not (MIN_YEAR <= due.year <= MAX_YEAR) or due < earliest:
            continue
        kind = str(item.get("kind", "other")).strip().lower()
        if kind not in KINDS:
            kind = "other"
        label = str(item.get("label", "")).strip()[:120] or {
            "expiry": "Valid until", "renewal": "Renewal due", "due": "Payment / filing due",
        }.get(kind, "Important date")
        cleaned.append({"label": label, "kind": kind, "due_date": due, "evidence": "Read by AI from the document"})
    return cleaned


def merge_candidates(auto: list[dict], ai: list[dict]) -> list[dict]:
    """AI wording wins for the label, but the row is kept once per (date, kind)."""
    merged: dict[tuple[date, str], dict] = {}
    for item in auto:
        merged[(item["due_date"], item["kind"])] = {**item, "source": "auto"}
    for item in ai:
        key = (item["due_date"], item["kind"])
        if key in merged:
            merged[key]["label"] = item["label"]
            merged[key]["source"] = "ai"
        else:
            merged[key] = {**item, "source": "ai"}
    return sorted(merged.values(), key=lambda item: item["due_date"])


def sync_document_deadlines(db: Session, *, document_id: int, owner: str, candidates: list[dict]) -> int:
    """Upsert deadlines for one document. Returns how many rows were added."""
    existing = db.query(Deadline).filter(Deadline.document_id == document_id).all()
    # An edited row is matched by the date the scanner originally found, not the
    # date the person typed over it.
    by_key = {(row.detected_date or row.due_date, row.kind): row for row in existing}
    wanted = {(c["due_date"], c["kind"]) for c in candidates}

    added = 0
    for c in candidates:
        key = (c["due_date"], c["kind"])
        row = by_key.get(key)
        if row is None:
            db.add(
                Deadline(
                    document_id=document_id, owner=owner, label=c["label"], kind=c["kind"],
                    due_date=c["due_date"], source=c["source"], status="open", evidence=c.get("evidence"),
                )
            )
            added += 1
        elif row.source != "manual" and row.status == "open" and row.detected_date is None:
            row.label = c["label"]
            row.source = c["source"]
            row.evidence = c.get("evidence")

    # Drop stale machine-found rows that are still open and no longer in the text.
    for key, row in by_key.items():
        if key not in wanted and row.source in ("auto", "ai") and row.status == "open" and row.detected_date is None:
            db.delete(row)

    db.commit()
    return added


# ---- presentation helpers -------------------------------------------------

def urgency_for(due: date, status: str, today: date | None = None) -> tuple[int, str]:
    """(days_left, bucket). Buckets: done | overdue | critical | soon | upcoming."""
    today = today or today_ist()
    days_left = (due - today).days
    if status != "open":
        return days_left, "done"
    if days_left < 0:
        return days_left, "overdue"
    if days_left <= 7:
        return days_left, "critical"
    if days_left <= 30:
        return days_left, "soon"
    return days_left, "upcoming"
