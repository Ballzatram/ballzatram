from __future__ import annotations

import json
import os
from typing import Any

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
        "description": "Score seed candidates against the thesis and return suitability categories.",
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

SEED_OPPORTUNITIES: list[dict[str, Any]] = [
    {
        "id": "york-kays-drive",
        "title": "8088 Kays Drive equestrian estate lead",
        "status": "live",
        "sourceUrl": "https://www.landsearch.com/properties/8088-kays-dr-york-sc-29745/5236376",
        "sourceVerification": "Exact LandSearch source page checked in the committed research record; broker, MLS, and county GIS verification still required.",
        "fitScore": 91,
        "readinessScore": 84,
        "riskScore": 39,
        "missingData": ["county parcel boundary", "zoning confirmation", "utility letters", "event-use permissions"],
        "nextDiligence": [
            "Call listing broker to confirm active status and full offering package.",
            "Pull York County GIS parcel card, boundary, ownership, zoning, and floodplain layers.",
            "Estimate field layout, access, utility, and improvement reuse costs before memo reliance.",
        ],
    },
    {
        "id": "chester-humpback-bridge",
        "title": "Humpback Bridge Road large-acre tract",
        "status": "live",
        "sourceUrl": "https://www.landsearch.com/properties/humpback-bridge-rd-chester-sc-29712/4797527",
        "sourceVerification": "Exact source page checked in the committed research record; listing facts require broker and county reconciliation.",
        "fitScore": 83,
        "readinessScore": 73,
        "riskScore": 48,
        "missingData": ["wetlands/floodplain screen", "utility availability", "field layout", "access plan"],
        "nextDiligence": [
            "Confirm active status, full acreage, and asking price with the listing broker.",
            "Pull Chester County GIS parcel boundary, zoning, and floodplain/wetlands overlays.",
            "Screen likely field areas against topography, creek buffers, access, and clearing cost.",
        ],
    },
    {
        "id": "lancaster-charlotte-highway",
        "title": "Charlotte Highway close-in development parcel",
        "status": "live",
        "sourceUrl": "https://www.landsearch.com/properties/1-charlotte-hwy-lancaster-sc-29720/2490553",
        "sourceVerification": "Exact source page checked in the committed research record; price, acreage, zoning, and infrastructure assumptions require independent verification.",
        "fitScore": 78,
        "readinessScore": 66,
        "riskScore": 67,
        "missingData": ["entitlement path", "utility capacity", "wetlands details", "basis scenario"],
        "nextDiligence": [
            "Ask broker for offering package, entitlement notes, and utility assumptions.",
            "Review Lancaster County planning area, zoning, sewer/water access, and wetland constraints.",
            "Build a basis-sensitive scenario before ranking it above lower-cost alternatives.",
        ],
    },
    {
        "id": "hickory-grove-worth-mountain",
        "title": "Worth Mountain land-bank tract",
        "status": "live",
        "sourceUrl": "https://www.landsearch.com/properties/hickory-grove-sc-29717/4663937",
        "sourceVerification": "Exact source page checked in the committed research record; county GIS, broker, and site-level verification still required.",
        "fitScore": 72,
        "readinessScore": 62,
        "riskScore": 59,
        "missingData": ["topography", "buildable uplands", "utility path", "frontage/access details"],
        "nextDiligence": [
            "Verify parcel boundary, road frontage, utility availability, and any conservation adjacency limits.",
            "Screen topography and creek buffers before assuming event or field feasibility.",
            "Compare against lower-distance candidates before adding to paid memo scope.",
        ],
    },
    {
        "id": "sharon-morning-branch",
        "title": "Morning Branch / Blanton Road scale tract",
        "status": "live",
        "sourceUrl": "https://www.landsearch.com/properties/sharon-sc/4706308",
        "sourceVerification": "Exact source page checked in the committed research record; source facts must be independently verified before investor reliance.",
        "fitScore": 74,
        "readinessScore": 61,
        "riskScore": 63,
        "missingData": ["buildable uplands", "wetlands/floodplain", "clearing cost", "event access"],
        "nextDiligence": [
            "Call broker to confirm active status, acreage, and source facts.",
            "Pull York County GIS parcel boundary and wetlands/floodplain screens.",
            "Identify buildable uplands and compare clearing/access cost against thesis value.",
        ],
    },
    {
        "id": "statesville-myers-mill",
        "title": "Myers Mill regional estate benchmark",
        "status": "live",
        "sourceUrl": "https://www.landsearch.com/properties/334-myers-mill-rd-statesville-nc-28625/4912025",
        "sourceVerification": "Exact source page checked in the committed research record; treat as a benchmark until distance, operations, and local demand are reviewed.",
        "fitScore": 67,
        "readinessScore": 58,
        "riskScore": 62,
        "missingData": ["regional demand thesis", "operations plan", "zoning", "utility details"],
        "nextDiligence": [
            "Confirm source status and property facts with broker and county GIS.",
            "Decide whether a regional Iredell thesis exists before spending memo time.",
            "Use as a comp for improved agricultural acreage, not as the default shortlist leader.",
        ],
    },
]


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
    candidates = SEED_OPPORTUNITIES
    if requested_ids:
        requested = {item for item in requested_ids if item}
        candidates = [candidate for candidate in SEED_OPPORTUNITIES if candidate["id"] in requested]
    return sorted(candidates or SEED_OPPORTUNITIES, key=_strength, reverse=True)


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
    if candidate["status"] != "live":
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
    if candidate["status"] != "live":
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
    if candidate["status"] != "live":
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
            "status": candidate["status"],
            "note": candidate["sourceVerification"],
            "url": candidate["sourceUrl"],
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
            "candidateRecords": analysis["candidates"],
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
        parsed.setdefault("warnings", []).extend(
            [
                "AI synthesis used only provided records and thesis context.",
                "Human verification is still required before reliance.",
            ]
        )
        return ParcelResearchResponse(**parsed).model_dump(mode="json")
    except Exception as exc:  # noqa: BLE001 - API fallback must stay resilient.
        return _fallback(req, f"Live AI synthesis failed and deterministic fallback was returned: {exc}")
