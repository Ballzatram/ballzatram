from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from app.models.schemas import ParcelResearchRequest, ParcelResearchResponse

MODEL = os.getenv("OPENAI_PARCEL_MODEL", os.getenv("OPENAI_AGENT_MODEL", "gpt-4.1-mini"))

PARCEL_RESPONSE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "mode": {"type": "string", "enum": ["ai", "fallback"]},
        "normalizedThesis": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "useCase": {"type": "string"},
                "market": {"type": "string"},
                "acreageRange": {"type": "string"},
                "budget": {"type": "string"},
                "mustHaves": {"type": "array", "items": {"type": "string"}},
                "riskFactors": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["useCase", "market", "acreageRange", "budget", "mustHaves", "riskFactors"],
        },
        "rankedCandidateIds": {"type": "array", "items": {"type": "string"}},
        "toolEvents": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "toolName": {"type": "string"},
                    "status": {"type": "string", "enum": ["complete", "fallback", "skipped"]},
                    "summary": {"type": "string"},
                },
                "required": ["toolName", "status", "summary"],
            },
        },
        "candidateSuitability": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "candidateId": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": ["strong_fit", "conditional_fit", "weak_fit", "disqualified", "needs_source_review"],
                    },
                    "suitabilityScore": {"type": "integer", "minimum": 0, "maximum": 100},
                    "reasons": {"type": "array", "items": {"type": "string"}},
                    "dealKillers": {"type": "array", "items": {"type": "string"}},
                    "nextQuestions": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["candidateId", "category", "suitabilityScore", "reasons", "dealKillers", "nextQuestions"],
            },
        },
        "candidateRecords": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "county": {"type": "string"},
                    "state": {"type": "string"},
                    "market": {"type": "string"},
                    "acreage": {"type": ["number", "null"]},
                    "price": {"type": ["number", "null"]},
                    "pricePerAcre": {"type": ["number", "null"]},
                    "distanceMiles": {"type": ["number", "null"]},
                    "distanceLabel": {"type": ["string", "null"]},
                    "driveTimeMinutes": {"type": ["integer", "null"]},
                    "latitude": {"type": ["number", "null"]},
                    "longitude": {"type": ["number", "null"]},
                    "mapX": {"type": ["number", "null"]},
                    "mapY": {"type": ["number", "null"]},
                    "sourceType": {"type": "string", "enum": ["broker", "land-listing", "county-gis", "manual", "seed", "unknown"]},
                    "sourceStatus": {"type": "string", "enum": ["live", "partial", "unknown", "dead"]},
                    "sourceUrl": {"type": ["string", "null"]},
                    "sourceLabel": {"type": ["string", "null"]},
                    "listingId": {"type": ["string", "null"]},
                    "lastResearched": {"type": ["string", "null"]},
                    "dataConfidence": {"type": "integer", "minimum": 0, "maximum": 100},
                    "fitScore": {"type": "integer", "minimum": 0, "maximum": 100},
                    "riskScore": {"type": "integer", "minimum": 0, "maximum": 100},
                    "readinessScore": {"type": "integer", "minimum": 0, "maximum": 100},
                    "tier": {
                        "type": "string",
                        "enum": [
                            "Tier 1 - Facility Candidate",
                            "Tier 2 - Destination / Event Use",
                            "Tier 3 - Land Bank / Conservation",
                            "Watchlist"
                        ],
                    },
                    "rationale": {"type": "string"},
                    "sourceVerification": {"type": "string"},
                    "diligenceConcerns": {"type": "array", "items": {"type": "string"}},
                    "nextDiligence": {"type": "array", "items": {"type": "string"}},
                    "missingData": {"type": "array", "items": {"type": "string"}},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "verificationNote": {"type": "string"},
                },
                "required": [
                    "id",
                    "title",
                    "county",
                    "state",
                    "market",
                    "acreage",
                    "price",
                    "pricePerAcre",
                    "distanceMiles",
                    "distanceLabel",
                    "driveTimeMinutes",
                    "latitude",
                    "longitude",
                    "mapX",
                    "mapY",
                    "sourceType",
                    "sourceStatus",
                    "sourceUrl",
                    "sourceLabel",
                    "listingId",
                    "lastResearched",
                    "dataConfidence",
                    "fitScore",
                    "riskScore",
                    "readinessScore",
                    "tier",
                    "rationale",
                    "sourceVerification",
                    "diligenceConcerns",
                    "nextDiligence",
                    "missingData",
                    "tags",
                    "verificationNote",
                ],
            },
        },
        "sourceAudit": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "candidateId": {"type": ["string", "null"]},
                    "title": {"type": "string"},
                    "status": {"type": "string", "enum": ["live", "partial", "unknown", "dead", "fallback", "missing"]},
                    "note": {"type": "string"},
                    "url": {"type": ["string", "null"]},
                },
                "required": ["candidateId", "title", "status", "note", "url"],
            },
        },
        "missingData": {"type": "array", "items": {"type": "string"}},
        "warnings": {"type": "array", "items": {"type": "string"}},
        "nextDiligence": {"type": "array", "items": {"type": "string"}},
        "memo": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "executiveSummary": {"type": "string"},
                "sourceReadiness": {"type": "string"},
                "diligencePlan": {"type": "array", "items": {"type": "string"}},
                "paidMemoScope": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["executiveSummary", "sourceReadiness", "diligencePlan", "paidMemoScope"],
        },
    },
    "required": [
        "mode",
        "normalizedThesis",
        "rankedCandidateIds",
        "toolEvents",
        "candidateSuitability",
        "candidateRecords",
        "sourceAudit",
        "missingData",
        "warnings",
        "nextDiligence",
        "memo",
    ],
}

PARCEL_TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "extract_project_thesis",
        "description": "Normalize the user's project thesis into acquisition criteria.",
        "strict": True,
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"requestSummary": {"type": "string"}},
            "required": ["requestSummary"],
        },
    },
    {
        "type": "function",
        "name": "score_property_suitability",
        "description": "Score seed and user-provided candidates against the thesis and return suitability categories.",
        "strict": True,
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"candidateIds": {"type": "array", "items": {"type": "string"}}},
            "required": ["candidateIds"],
        },
    },
    {
        "type": "function",
        "name": "audit_sources_and_missing_data",
        "description": "Audit source status, user-provided listing URLs, and missing diligence data.",
        "strict": True,
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"includeUserLinks": {"type": "boolean"}},
            "required": ["includeUserLinks"],
        },
    },
    {
        "type": "function",
        "name": "generate_broker_questions",
        "description": "Generate next diligence and broker questions for the ranked candidates.",
        "strict": True,
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"candidateIds": {"type": "array", "items": {"type": "string"}}},
            "required": ["candidateIds"],
        },
    },
]

DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "parcel-opportunities.json"


def load_seed_candidates() -> list[dict[str, Any]]:
    with DATA_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


SEED_OPPORTUNITIES = load_seed_candidates()


def get_seed_candidate_records() -> list[dict[str, Any]]:
    return SEED_OPPORTUNITIES


def stable_user_candidate_id(source_url: str, notes: str, title: str) -> str:
    canonical = f"{source_url.strip().lower()}|{title.strip().lower()}|{notes.strip().lower()}"
    value = 0
    for char in canonical:
        value = ((value * 31) + ord(char)) % 1_000_000_007
    return f"user-{_base36(value)}"


def _base36(value: int) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if value == 0:
        return "0"
    result = ""
    while value:
        value, remainder = divmod(value, 36)
        result = alphabet[remainder] + result
    return result


def _url_host(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url if re.match(r"^https?://", url, re.I) else f"https://{url}")
    return parsed.netloc.replace("www.", "")


def _first_line(value: str) -> str:
    return next((line.strip() for line in value.splitlines() if line.strip()), "")


def _extract_acreage(notes: str) -> float | None:
    match = re.search(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:acres|acre|ac\b)", notes, re.I)
    return float(match.group(1)) if match else None


def _extract_price(notes: str) -> float | None:
    match = re.search(r"\$\s*(\d+(?:[,\d]{0,12})?(?:\.\d+)?)\s*(m|million|k)?\b", notes, re.I)
    if not match:
        return None
    amount = float(match.group(1).replace(",", ""))
    unit = (match.group(2) or "").lower()
    if unit in {"m", "million"}:
        return amount * 1_000_000
    if unit == "k":
        return amount * 1_000
    return amount


def normalize_candidate_inputs(req: ParcelResearchRequest) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for index, candidate_input in enumerate(req.candidateInputs, start=1):
        notes = candidate_input.notes.strip()
        source_url = (candidate_input.sourceUrl or "").strip() or None
        title = (candidate_input.title or "").strip() or _first_line(notes)[:90]
        if not title:
            title = f"User lead: {_url_host(source_url or '') or f'property {index}'}"

        acreage = _extract_acreage(notes)
        price = _extract_price(notes)
        price_per_acre = round(price / acreage) if price and acreage else None
        known_fact_count = sum(1 for value in [source_url, acreage, price] if value)
        notes_lower = notes.lower()
        must_haves = " ".join(req.thesis.mustHaves).lower()
        fit_score = 52
        if acreage and acreage >= 50:
            fit_score += 10
        if any(term in notes_lower for term in ["frontage", "access", "road"]):
            fit_score += 6
        if any(term in notes_lower for term in ["utility", "utilities", "water", "sewer", "power"]):
            fit_score += 6
        if any(term in notes_lower for term in ["pasture", "field", "cleared", "flat"]):
            fit_score += 5
        if "acre" in must_haves and not acreage:
            fit_score -= 4

        risk_score = 72
        if any(term in notes_lower for term in ["wetland", "flood", "easement", "zoning", "entitlement"]):
            risk_score += 6
        if any(term in notes_lower for term in ["survey", "gis", "parcel id", "zoning confirmed"]):
            risk_score -= 6

        readiness_score = min(58, 30 + known_fact_count * 6 + (8 if len(notes) > 120 else 0))
        data_confidence = min(48, 28 + known_fact_count * 5 + (5 if len(notes) > 120 else 0))
        map_seed = int(stable_user_candidate_id(source_url or "", notes, title).replace("user-", ""), 36)

        candidates.append(
            {
                "id": stable_user_candidate_id(source_url or "", notes, title),
                "title": title,
                "county": "",
                "state": "",
                "market": req.thesis.market,
                "acreage": acreage,
                "price": price,
                "pricePerAcre": price_per_acre,
                "distanceMiles": None,
                "distanceLabel": "User-provided lead; location not verified",
                "driveTimeMinutes": None,
                "latitude": None,
                "longitude": None,
                "mapX": 35 + (map_seed % 30),
                "mapY": 34 + ((map_seed // 31) % 42),
                "sourceType": "manual",
                "sourceStatus": "unknown",
                "sourceUrl": source_url,
                "sourceLabel": "User-provided URL + notes",
                "listingId": None,
                "lastResearched": None,
                "dataConfidence": data_confidence,
                "fitScore": max(0, min(100, fit_score)),
                "riskScore": max(0, min(100, risk_score)),
                "readinessScore": max(0, min(100, readiness_score)),
                "tier": "Watchlist",
                "rationale": (
                    "User-provided lead created from pasted notes. Parcel can triage it against the thesis, "
                    "but it has not verified availability, acreage, price, location, zoning, access, or source facts."
                ),
                "sourceVerification": (
                    "Unverified user-provided candidate. No live scraping, broker confirmation, county GIS pull, "
                    "or listing fact verification has run for this lead."
                ),
                "diligenceConcerns": [
                    "Source status is unknown until the listing, broker, or owner confirms availability.",
                    "Acreage, price, ownership, parcel IDs, zoning, access, utilities, and environmental constraints are unverified.",
                    "Use this as a triage placeholder until source documents and county records are collected.",
                ],
                "nextDiligence": [
                    "Confirm the listing or broker source and capture active status, asking price, acreage, ownership, and parcel IDs.",
                    "Pull county GIS parcel boundary, zoning, floodplain/wetlands, access, utility, and easement records.",
                    "Replace user notes with verified source documents before relying on suitability or memo conclusions.",
                ],
                "missingData": [
                    "active listing status",
                    "parcel boundary",
                    "acreage confirmation",
                    "asking price confirmation",
                    "zoning/access/utilities",
                    "wetlands/floodplain screen",
                ],
                "tags": ["user lead", "unverified", "needs source review"],
                "verificationNote": "Dynamic lead is session-only and unverified; Parcel did not scrape or verify the source URL.",
            }
        )
    return candidates


def build_candidate_universe(req: ParcelResearchRequest) -> list[dict[str, Any]]:
    return [*SEED_OPPORTUNITIES, *normalize_candidate_inputs(req)]


def _strength(candidate: dict[str, Any]) -> int:
    return int(candidate["fitScore"]) + int(candidate["readinessScore"]) - int(candidate["riskScore"])


def _unique(values: list[str], limit: int = 12) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
        if len(result) >= limit:
            break
    return result


def _selected_candidates(req: ParcelResearchRequest) -> list[dict[str, Any]]:
    requested_ids = [*req.shortlistedOpportunityIds, *req.selectedOpportunityIds]
    candidates = build_candidate_universe(req)
    if requested_ids:
        requested = {item for item in requested_ids if item}
        requested_candidates = [candidate for candidate in candidates if candidate["id"] in requested]
        remaining_candidates = [candidate for candidate in candidates if candidate["id"] not in requested]
        candidates = [*requested_candidates, *remaining_candidates]
    return sorted(candidates or build_candidate_universe(req), key=_strength, reverse=True)


def extract_project_thesis(req: ParcelResearchRequest) -> dict[str, Any]:
    return {
        "useCase": req.thesis.useCase.strip(),
        "market": req.thesis.market.strip(),
        "acreageRange": req.thesis.acreageRange.strip(),
        "budget": req.thesis.budget.strip(),
        "mustHaves": [item.strip() for item in req.thesis.mustHaves if item.strip()],
        "riskFactors": [item.strip() for item in req.thesis.riskFactors if item.strip()],
    }


def normalize_listing_links(req: ParcelResearchRequest) -> list[dict[str, Any]]:
    return [
        {
            "candidateId": None,
            "title": "User-provided listing link",
            "status": "unknown",
            "note": "The backend records this URL as user-provided research context only; it has not scraped, verified, or guaranteed listing facts.",
            "url": link,
        }
        for link in req.thesis.listingLinks
    ]


def _suitability_category(score: int, candidate: dict[str, Any]) -> str:
    if candidate["sourceStatus"] != "live":
        return "needs_source_review"
    if score >= 82:
        return "strong_fit"
    if score >= 68:
        return "conditional_fit"
    if score >= 50:
        return "weak_fit"
    return "disqualified"


def score_candidate_suitability(candidate: dict[str, Any], req: ParcelResearchRequest) -> dict[str, Any]:
    raw_score = (
        (int(candidate["fitScore"]) * 0.45)
        + (int(candidate["readinessScore"]) * 0.35)
        + ((100 - int(candidate["riskScore"])) * 0.2)
    )
    must_haves = " ".join(req.thesis.mustHaves).lower()
    missing = [item.lower() for item in candidate["missingData"]]
    if candidate["sourceStatus"] != "live":
        raw_score -= 12
    if "utility" in must_haves and any("utility" in item for item in missing):
        raw_score -= 4
    if "frontage" in must_haves and any("frontage" in item or "access" in item for item in missing):
        raw_score -= 4
    if int(candidate["riskScore"]) >= 65:
        raw_score -= 5

    score = max(0, min(100, round(raw_score)))
    deal_killers: list[str] = []
    if int(candidate["riskScore"]) >= 65:
        deal_killers.append("High risk score; do not advance without entitlement, access, and environmental review.")
    if any("zoning" in item for item in missing):
        deal_killers.append("Zoning path is not proven by the current research record.")
    if any("wetlands" in item or "floodplain" in item for item in missing):
        deal_killers.append("Wetlands or floodplain constraints could materially reduce usable acreage.")
    if any("access" in item or "frontage" in item for item in missing):
        deal_killers.append("Access/frontage must be verified before site planning or valuation reliance.")
    if candidate["sourceStatus"] != "live":
        deal_killers.append("Source status needs review before the candidate can be treated as available.")

    reasons = [
        f"Fit score {candidate['fitScore']}/100 and readiness {candidate['readinessScore']}/100 against the current project thesis.",
        f"Risk score {candidate['riskScore']}/100 keeps the recommendation caveated until missing data is cleared.",
        candidate["sourceVerification"],
    ]
    next_questions = generate_broker_questions(candidate, req)

    return {
        "candidateId": candidate["id"],
        "category": _suitability_category(score, candidate),
        "suitabilityScore": score,
        "reasons": reasons[:4],
        "dealKillers": deal_killers[:4],
        "nextQuestions": next_questions[:4],
    }


def audit_candidate_sources(candidates: list[dict[str, Any]], user_link_audit: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidate_audit = [
        {
            "candidateId": candidate["id"],
            "title": candidate["title"],
            "status": candidate["sourceStatus"],
            "note": candidate["sourceVerification"],
            "url": candidate.get("sourceUrl"),
        }
        for candidate in candidates
    ]
    return candidate_audit + user_link_audit


def detect_missing_data(candidates: list[dict[str, Any]]) -> list[str]:
    return _unique([item for candidate in candidates for item in candidate["missingData"]], limit=10)


def generate_broker_questions(candidate: dict[str, Any], req: ParcelResearchRequest) -> list[str]:
    return [
        f"Is {candidate['title']} still active, and can you confirm acreage, asking price, ownership, and parcel IDs?",
        "Can you provide current survey, county GIS parcel map, zoning confirmation, and any easement/access documents?",
        f"Are there known issues for {req.thesis.useCase.lower()} use, including utilities, floodplain/wetlands, entrances, parking, or event permissions?",
        "What facts in the listing should be treated as broker-represented versus independently verified county or engineering data?",
    ]


def compare_candidates(candidates: list[dict[str, Any]], suitability: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scores = {item["candidateId"]: item for item in suitability}
    return sorted(candidates, key=lambda candidate: scores[candidate["id"]]["suitabilityScore"], reverse=True)


def synthesize_memo(
    req: ParcelResearchRequest,
    candidates: list[dict[str, Any]],
    missing_data: list[str],
    next_diligence: list[str],
) -> dict[str, Any]:
    best = candidates[0]
    return {
        "executiveSummary": (
            f"{best['title']} is the strongest current research fit for a {req.thesis.useCase.lower()} "
            f"thesis in {req.thesis.market}, pending source, parcel, zoning, access, utility, and environmental verification."
        ),
        "sourceReadiness": (
            "The preview separates source status from investment readiness. Exact listing links and pasted URLs are research aids, "
            "not verified acquisition facts."
        ),
        "diligencePlan": next_diligence[:5],
        "paidMemoScope": [
            "Verify active listing status, acreage, parcel boundary, ownership, and source chain.",
            "Pull county GIS, zoning, floodplain, wetlands, access, utility, and easement records.",
            "Rank candidates against the thesis and write a human-reviewed diligence memo with caveats.",
        ],
    }


def _tool_analysis(req: ParcelResearchRequest) -> dict[str, Any]:
    normalized_thesis = extract_project_thesis(req)
    link_audit = normalize_listing_links(req)
    base_candidates = _selected_candidates(req)
    suitability = [score_candidate_suitability(candidate, req) for candidate in base_candidates]
    candidates = compare_candidates(base_candidates, suitability)
    suitability = sorted(suitability, key=lambda item: item["suitabilityScore"], reverse=True)
    source_audit = audit_candidate_sources(candidates, link_audit)
    missing_data = detect_missing_data(candidates)
    next_diligence = _unique(
        [
            item
            for candidate in candidates
            for item in [*candidate["nextDiligence"], *generate_broker_questions(candidate, req)[:2]]
        ],
        limit=10,
    )
    tool_events = [
        {
            "toolName": "extract_project_thesis",
            "status": "complete",
            "summary": f"Normalized {normalized_thesis['useCase']} in {normalized_thesis['market']} into screenable criteria.",
        },
        {
            "toolName": "normalize_listing_links",
            "status": "complete" if link_audit else "skipped",
            "summary": f"Recorded {len(link_audit)} user-provided listing link(s) as unverified context.",
        },
        {
            "toolName": "score_property_suitability",
            "status": "complete",
            "summary": f"Scored {len(suitability)} candidate(s) into suitability categories.",
        },
        {
            "toolName": "audit_sources_and_missing_data",
            "status": "complete",
            "summary": f"Audited {len(source_audit)} source item(s) and found {len(missing_data)} missing data point(s).",
        },
        {
            "toolName": "compare_candidates",
            "status": "complete",
            "summary": f"Ranked candidates by suitability score, source status, readiness, fit, and risk.",
        },
        {
            "toolName": "generate_broker_questions",
            "status": "complete",
            "summary": "Generated broker and county-record questions for next diligence.",
        },
        {
            "toolName": "synthesize_memo",
            "status": "fallback",
            "summary": "Prepared a source-aware memo preview from deterministic tool outputs.",
        },
    ]

    return {
        "normalizedThesis": normalized_thesis,
        "candidates": candidates,
        "rankedCandidateIds": [candidate["id"] for candidate in candidates],
        "toolEvents": tool_events,
        "candidateSuitability": suitability,
        "candidateRecords": candidates,
        "sourceAudit": source_audit,
        "missingData": missing_data,
        "nextDiligence": next_diligence,
        "memo": synthesize_memo(req, candidates, missing_data, next_diligence),
    }


def _fallback(req: ParcelResearchRequest, summary_override: str | None = None) -> dict[str, Any]:
    analysis = _tool_analysis(req)

    warnings = [
        "Fallback mode uses committed demo records and deterministic ranking.",
        "No live scraping or paid entitlement check ran for this request.",
        "Parcel Intelligence is research support, not brokerage, appraisal, legal, engineering, tax, or investment advice.",
        "Every listing, parcel, zoning, access, ownership, and environmental fact must be independently verified before reliance.",
    ]
    if summary_override:
        warnings.insert(0, summary_override)

    return {
        "mode": "fallback",
        "normalizedThesis": analysis["normalizedThesis"],
        "rankedCandidateIds": analysis["rankedCandidateIds"],
        "toolEvents": analysis["toolEvents"],
        "candidateSuitability": analysis["candidateSuitability"],
        "candidateRecords": analysis["candidateRecords"],
        "sourceAudit": analysis["sourceAudit"],
        "missingData": analysis["missingData"],
        "warnings": warnings,
        "nextDiligence": analysis["nextDiligence"],
        "memo": analysis["memo"],
    }


def _instructions() -> str:
    return (
        "You are Parcel Intelligence by Ballzatram, a sober land research backend. "
        "Synthesize only from the provided thesis, selected candidates, and user-provided links. "
        "Do not scrape the web, invent parcel facts, or call a listing verified. "
        "Keep source quality, missing data, and next diligence prominent. "
        "Speak like a land research analyst evaluating which available properties fit a specific project. "
        "The paid deliverable is a human-reviewed founding diligence memo, not an automated acquisition decision."
    )


def _run_parcel_tool(name: str, req: ParcelResearchRequest, analysis: dict[str, Any]) -> dict[str, Any]:
    if name == "extract_project_thesis":
        return analysis["normalizedThesis"]
    if name == "score_property_suitability":
        return {"rankedCandidateIds": analysis["rankedCandidateIds"], "candidateSuitability": analysis["candidateSuitability"]}
    if name == "audit_sources_and_missing_data":
        return {"sourceAudit": analysis["sourceAudit"], "missingData": analysis["missingData"]}
    if name == "generate_broker_questions":
        return {"nextDiligence": analysis["nextDiligence"]}
    return {"status": "skipped", "note": f"Unknown Parcel tool requested: {name}"}


def build_parcel_research(req: ParcelResearchRequest) -> dict[str, Any]:
    fallback = _fallback(req)
    if not os.getenv("OPENAI_API_KEY"):
        return fallback

    try:
        from openai import OpenAI

        client = OpenAI()
        analysis = _tool_analysis(req)
        tool_prompt = {
            "task": "Decide which Parcel tool outputs are needed before final suitability synthesis.",
            "thesis": req.thesis.model_dump(mode="json"),
            "candidateIds": analysis["rankedCandidateIds"],
            "dataBoundary": "No live scraping. Only user-provided links and committed seed listing records are available.",
        }
        tool_response = client.responses.create(
            model=MODEL,
            instructions=_instructions(),
            input=json.dumps(tool_prompt, indent=2),
            tools=PARCEL_TOOL_DEFINITIONS,
        )
        tool_input: list[Any] = [{"role": "user", "content": json.dumps(tool_prompt, indent=2)}]
        tool_input += tool_response.output
        tool_call_count = 0
        for item in tool_response.output:
            if getattr(item, "type", None) == "function_call":
                tool_call_count += 1
                tool_input.append(
                    {
                        "type": "function_call_output",
                        "call_id": item.call_id,
                        "output": json.dumps(_run_parcel_tool(item.name, req, analysis)),
                    }
                )

        prompt = {
            "thesis": req.thesis.model_dump(mode="json"),
            "fallbackDraft": fallback,
            "candidateRecords": analysis["candidateRecords"],
            "serverToolOutputs": analysis,
            "toolCallingNote": f"Responses tool-call pass returned {tool_call_count} function call(s).",
        }
        response = client.responses.create(
            model=MODEL,
            instructions=_instructions(),
            input=tool_input
            + [
                {
                    "role": "user",
                    "content": (
                        "Return final ParcelResearchResponse JSON using this deterministic server analysis as the "
                        f"grounding data:\n{json.dumps(prompt, indent=2)}"
                    ),
                }
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "parcel_research_response",
                    "strict": True,
                    "schema": PARCEL_RESPONSE_JSON_SCHEMA,
                }
            },
        )
        parsed = json.loads(response.output_text)
        parsed["mode"] = "ai"
        parsed["candidateRecords"] = analysis["candidateRecords"]
        parsed.setdefault("warnings", []).extend(
            [
                "AI synthesis used only provided records and thesis context.",
                "Human verification is still required before reliance.",
            ]
        )
        return ParcelResearchResponse(**parsed).model_dump(mode="json")
    except Exception as exc:  # noqa: BLE001 - API fallback must stay resilient.
        return _fallback(req, f"Live AI synthesis failed and deterministic fallback was returned: {exc}")
