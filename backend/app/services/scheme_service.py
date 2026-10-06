"""Scheme Matcher - which government schemes might this person qualify for, and
how ready are their documents?

Two inputs:
  * the optional BusinessProfile the person fills in (entity type, stage,
    sector, gender, social category), and
  * the documents they have already uploaded, reduced to canonical types by
    app/services/doc_types.py.

The catalog lives in app/data/schemes.json so it can be edited without code
changes. Each scheme carries machine-readable `rules`:

    entity_types / business_stage / sectors / states / genders /
    social_categories   -> the profile value must be one of the listed values
    any_of: [ {...}, {...} ]  -> at least one of the alternative rule blocks

A rule is evaluated three-valued per field: True (profile value allowed),
False (profile value not allowed) or None (the person left it blank). One
False excludes the scheme; a None downgrades it from "likely" to "possible"
and the answer says which blanks would settle it. Nothing is ever guessed.

Matching is a screening aid, not a decision: results are labelled indicative
and always link to the official portal.
"""
import json
import logging
from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.setu import BusinessProfile, DocumentInsight
from app.services.doc_types import label_for

logger = logging.getLogger("setudocs.schemes")

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "schemes.json"

PROFILE_OPTIONS = {
    "entity_type": ["individual", "farmer", "street_vendor", "artisan", "micro_enterprise", "small_enterprise", "startup"],
    "business_stage": ["planning", "running"],
    "sector": ["manufacturing", "services", "trading", "agriculture"],
    "gender": ["female", "male", "other"],
    "social_category": ["general", "sc", "st", "obc"],
}

# rule key -> profile attribute
_RULE_FIELDS = {
    "entity_types": "entity_type",
    "business_stage": "business_stage",
    "sectors": "sector",
    "states": "state",
    "genders": "gender",
    "social_categories": "social_category",
}


_FIELD_LABELS = {
    "entity_type": "Entity type",
    "business_stage": "Business stage",
    "sector": "Sector",
    "state": "State",
    "gender": "Gender",
    "social_category": "Social category",
}
_VALUE_LABELS = {"sc": "SC", "st": "ST", "obc": "OBC"}


def _value_label(value: str) -> str:
    return _VALUE_LABELS.get(value, value.replace("_", " ").capitalize())

@lru_cache(maxsize=1)
def load_catalog() -> dict:
    with CATALOG_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def _profile_dict(profile: BusinessProfile | None) -> dict:
    if profile is None:
        return {}
    return {
        "entity_type": profile.entity_type,
        "business_stage": profile.business_stage,
        "sector": profile.sector,
        "state": profile.state,
        "gender": profile.gender,
        "social_category": profile.social_category,
    }


def _eval_block(block: dict, profile: dict) -> tuple[bool | None, list[str]]:
    """Evaluate one rule block. Returns (verdict, blank_fields_that_mattered)."""
    verdict: bool | None = True
    blanks: list[str] = []
    for rule_key, attr in _RULE_FIELDS.items():
        allowed = block.get(rule_key)
        if not allowed:
            continue
        value = profile.get(attr)
        if not value:
            blanks.append(attr)
            if verdict is True:
                verdict = None
        elif value not in allowed:
            return False, []
    return verdict, blanks


def evaluate_rules(rules: dict, profile: dict) -> tuple[bool | None, list[str]]:
    """Full evaluation including the any_of alternatives."""
    verdict, blanks = _eval_block(rules, profile)
    if verdict is False:
        return False, []

    alternatives = rules.get("any_of")
    if alternatives:
        results = [_eval_block(alt, profile) for alt in alternatives]
        if any(r[0] is True for r in results):
            pass  # satisfied outright - the blanks of the other branches don't matter
        elif any(r[0] is None for r in results):
            for _, alt_blanks in results:
                blanks.extend(alt_blanks)
            if verdict is True:
                verdict = None
        else:
            return False, []

    return verdict, sorted(set(blanks))


def _block_reasons(block: dict, profile: dict) -> list[str]:
    """Profile answers that satisfy this rule block, as plain sentences."""
    reasons = []
    for rule_key, attr in _RULE_FIELDS.items():
        allowed = block.get(rule_key)
        value = profile.get(attr)
        if allowed and value and value in allowed:
            reasons.append(f"{_FIELD_LABELS[attr]}: {_value_label(value)}")
    return reasons


def profile_reasons(rules: dict, profile: dict) -> list[str]:
    """Which of the person's own answers made the rules pass. For an `any_of`
    scheme only the alternative that actually matched is quoted."""
    reasons = _block_reasons(rules, profile)
    for alternative in rules.get("any_of") or []:
        if _eval_block(alternative, profile)[0] is True:
            reasons += [r for r in _block_reasons(alternative, profile) if r not in reasons]
            break
    return reasons


def _doc_group_status(groups: list[dict], held: set[str]) -> list[dict]:
    out = []
    for group in groups:
        have = [t for t in group["any"] if t in held]
        out.append(
            {
                "label": group["label"],
                "have": bool(have),
                "matched_type": label_for(have[0]) if have else None,
            }
        )
    return out


def held_document_types(db: Session, username: str) -> dict[str, list[int]]:
    """{doc_type: [document_id, ...]} across the person's own uploads."""
    rows = (
        db.query(Document.id, DocumentInsight.doc_types)
        .join(DocumentInsight, DocumentInsight.document_id == Document.id)
        .filter(Document.uploaded_by == username)
        .all()
    )
    held: dict[str, list[int]] = {}
    for document_id, doc_types in rows:
        for doc_type in doc_types or []:
            held.setdefault(doc_type, []).append(document_id)
    return held


def get_profile(db: Session, username: str) -> BusinessProfile | None:
    return db.query(BusinessProfile).filter(BusinessProfile.username == username).first()


def save_profile(db: Session, username: str, values: dict) -> BusinessProfile:
    profile = get_profile(db, username)
    if profile is None:
        profile = BusinessProfile(username=username)
        db.add(profile)
    for attr in ("entity_type", "business_stage", "sector", "state", "gender", "social_category"):
        if attr in values:
            value = (values[attr] or "").strip() or None
            if value and attr in PROFILE_OPTIONS and value not in PROFILE_OPTIONS[attr]:
                raise ValueError(f"{attr} must be one of: {', '.join(PROFILE_OPTIONS[attr])}")
            setattr(profile, attr, value)
    db.commit()
    db.refresh(profile)
    return profile


def match_schemes(db: Session, username: str) -> dict:
    catalog = load_catalog()
    profile_row = get_profile(db, username)
    profile = _profile_dict(profile_row)
    held = held_document_types(db, username)
    held_set = set(held)

    results: list[dict] = []
    for scheme in catalog["schemes"]:
        verdict, blanks = evaluate_rules(scheme.get("rules", {}), profile)
        if verdict is False:
            continue

        required = _doc_group_status(scheme.get("required_docs", []), held_set)
        helpful = _doc_group_status(scheme.get("helpful_docs", []), held_set)
        have_count = sum(1 for item in required if item["have"])
        readiness = round(100 * have_count / len(required)) if required else 100

        boosts = []
        for boost in scheme.get("boosts", []):
            boost_verdict, _ = evaluate_rules(boost.get("if", {}), profile)
            if boost_verdict is True:
                boosts.append(boost["text"])

        already_done = any(t in held_set for t in scheme.get("already_done_if", []))

        reasons = profile_reasons(scheme.get("rules", {}), profile)
        for item in required:
            if item["have"]:
                reasons.append(f"You have: {item['matched_type']}")
        for item in helpful:
            if item["have"]:
                reasons.append(f"You have: {item['matched_type']} (helps your application)")
        reasons = list(dict.fromkeys(reasons))  # one document can satisfy several groups

        results.append(
            {
                "id": scheme["id"],
                "name": scheme["name"],
                "full_name": scheme["full_name"],
                "agency": scheme["agency"],
                "category": scheme["category"],
                "benefit": scheme["benefit"],
                "who_for": scheme["who_for"],
                "match": "likely" if verdict is True else "possible",
                "missing_profile_fields": blanks,
                "reasons": reasons,
                "required_docs": required,
                "helpful_docs": helpful,
                "readiness_percent": readiness,
                "boosts": boosts,
                "already_done": already_done,
                "apply_url": scheme["apply"]["url"],
                "apply_steps": scheme["apply"]["steps"],
                "source": scheme.get("source"),
            }
        )

    # Likely before possible, then the most-ready first.
    results.sort(key=lambda r: (r["match"] != "likely", -r["readiness_percent"], r["name"]))

    return {
        "profile": {**profile, "is_complete": all(profile.get(k) for k in ("entity_type", "business_stage", "sector"))},
        "options": PROFILE_OPTIONS,
        "documents_analysed": sum(len(v) for v in held.values()),
        "held_types": [{"type": t, "label": label_for(t), "count": len(ids)} for t, ids in sorted(held.items())],
        "schemes": results,
        "verified_on": catalog["meta"]["verified_on"],
        "disclaimer": catalog["meta"]["disclaimer"],
    }
