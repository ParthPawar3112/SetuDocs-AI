"""Document-type detection for SetuDocs AI.

Turns OCR text (plus whatever title/category/keywords Gemini produced) into a
set of canonical document types such as "udyam" or "land_712". The Scheme
Matcher uses these to tell a person which documents they already hold for a
scheme and which are still missing.

Why rules and not another AI call: this runs on every upload, it must keep
working when the Gemini quota is exhausted, and a keyword table is easy to
test and to explain to a judge. Patterns cover English and Marathi
(Devanagari) because the source documents mix both.

Scoring: each *strong* pattern that hits is worth 2, each *weak* one 1. A type
is reported when its score reaches THRESHOLD (2), so a single strong phrase
("Udyam Registration Certificate") is enough, but a stray mention of "PAN" in
a GST certificate is not enough to call that file a PAN card.

Only the *type* of a document is kept. Identity numbers (Aadhaar, PAN, account
numbers) are deliberately never extracted or stored by this module.
"""
import re

THRESHOLD = 2

# key -> (human label, strong patterns, weak patterns). Patterns are matched
# case-insensitively against the combined document text.
DOC_TYPES: dict[str, dict] = {
    "aadhaar": {
        "label": "Aadhaar card",
        "strong": [r"unique identification authority", r"\buidai\b"],
        "weak": [r"aadhaar|aadhar|आधार", r"\b\d{4}\s\d{4}\s\d{4}\b", r"your aadhaar|enrol(l)?ment no|\bvid\b"],
    },
    "pan": {
        "label": "PAN card",
        "strong": [r"permanent account number card", r"पॅन कार्ड"],
        "weak": [r"income tax department|आयकर विभाग"],
    },
    "udyam": {
        "label": "Udyam registration",
        "strong": [r"udyam registration", r"udyog aadhaar", r"उद्यम नोंदणी", r"उद्योग आधार"],
        "weak": [r"\bmsme\b|micro enterprise|small enterprise|ministry of micro, small"],
    },
    "gst": {
        "label": "GST registration",
        "strong": [r"form gst reg", r"gst registration", r"जीएसटी नोंदणी"],
        "weak": [r"\bgstin\b", r"constitution of business"],
    },
    "shop_act": {
        "label": "Shop & Establishment licence",
        "strong": [
            r"shops? (and|&) establishments?",
            r"gumasta",
            r"दुकाने व आस्थापना",
            r"गुमास्ता",
        ],
        "weak": [r"establishment act"],
    },
    "trade_licence": {
        "label": "Trade licence",
        "strong": [r"trade licen[cs]e", r"व्यापार परवाना", r"व्यवसाय परवाना"],
        "weak": [],
    },
    "fssai": {
        "label": "FSSAI food licence",
        "strong": [r"fssai", r"food safety and standards"],
        "weak": [r"food business operator"],
    },
    "bank_proof": {
        "label": "Bank passbook / statement",
        "strong": [r"passbook", r"bank statement", r"account statement", r"पासबुक"],
        "weak": [r"\bifsc\b", r"account no", r"\bbranch\b"],
    },
    "ration_card": {
        "label": "Ration card",
        "strong": [r"ration card", r"शिधापत्रिका", r"रेशन कार्ड"],
        "weak": [r"food and civil supplies"],
    },
    "land_712": {
        "label": "7/12 land extract",
        "strong": [r"7\s*/\s*12", r"satbara", r"सातबारा", r"extract of land", r"गाव नमुना"],
        "weak": [r"\b8\s*-?\s*a\b|उतारा", r"khata|खाते क्रमांक", r"survey no|गट क्रमांक"],
    },
    "income_cert": {
        "label": "Income certificate",
        "strong": [r"income certificate", r"उत्पन्नाचा दाखला", r"उत्पन्न प्रमाणपत्र"],
        "weak": [r"annual income", r"वार्षिक उत्पन्न"],
    },
    "caste_certificate": {
        "label": "Caste certificate",
        "strong": [r"caste certificate", r"जात प्रमाणपत्र", r"caste validity", r"जात पडताळणी"],
        "weak": [r"scheduled (caste|tribe)|other backward"],
    },
    "domicile": {
        "label": "Domicile certificate",
        "strong": [r"domicile certificate", r"अधिवास प्रमाणपत्र", r"राहिवासी दाखला"],
        "weak": [r"domicile"],
    },
    "itr": {
        "label": "Income-tax return",
        "strong": [r"income tax return", r"\bitr-?\s?[1-7v]\b"],
        "weak": [r"acknowledgement number", r"assessment year"],
    },
    "electricity_bill": {
        "label": "Electricity bill",
        "strong": [r"electricity bill", r"msedcl", r"महावितरण", r"वीज बिल"],
        "weak": [r"consumer no", r"units consumed", r"meter no"],
    },
    "rent_agreement": {
        "label": "Rent / leave-and-licence agreement",
        "strong": [r"leave and licen[cs]e", r"rent agreement", r"भाडेकरार", r"लिव्ह अँड लायसन्स"],
        "weak": [r"licensor|lessor", r"licensee|lessee"],
    },
    "insurance": {
        "label": "Insurance policy",
        "strong": [r"insurance policy", r"policy schedule", r"विमा पॉलिसी"],
        "weak": [r"policy (no|number)", r"premium|sum assured", r"\binsurer\b"],
    },
    "driving_licence": {
        "label": "Driving licence",
        "strong": [r"driving licen[cs]e", r"वाहन चालक परवाना"],
        "weak": [r"transport authority", r"motor vehicles"],
    },
    "fire_noc": {
        "label": "Fire safety NOC",
        "strong": [r"fire noc", r"fire safety certificate", r"अग्निशमन", r"fire (&|and) emergency"],
        "weak": [r"fire officer"],
    },
    "project_report": {
        "label": "Project report",
        "strong": [r"detailed project report", r"\bdpr\b", r"project report", r"प्रकल्प अहवाल"],
        "weak": [r"projected (sales|turnover|profit)", r"cost of project", r"means of finance"],
    },
    "vending_proof": {
        "label": "Street-vending certificate / LoR",
        "strong": [r"certificate of vending", r"street vendor", r"letter of recommendation", r"फेरीवाला", r"फेरीवाले"],
        "weak": [r"vending"],
    },
}


def label_for(doc_type: str) -> str:
    return DOC_TYPES.get(doc_type, {}).get("label", doc_type)


def _score(text: str, spec: dict) -> int:
    score = 0
    for pattern in spec["strong"]:
        if re.search(pattern, text, flags=re.IGNORECASE):
            score += 2
    for pattern in spec["weak"]:
        if re.search(pattern, text, flags=re.IGNORECASE):
            score += 1
    return score


def detect_document_types(
    ocr_text: str | None,
    title: str | None = None,
    category: str | None = None,
    keywords: list[str] | None = None,
) -> list[str]:
    """Return the canonical types whose score reaches THRESHOLD, best first."""
    parts = [title or "", category or "", " ".join(keywords or []), (ocr_text or "")[:20000]]
    text = "\n".join(parts)
    if not text.strip():
        return []

    scored = []
    for key, spec in DOC_TYPES.items():
        score = _score(text, spec)
        if score >= THRESHOLD:
            scored.append((score, key))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [key for _, key in scored]
