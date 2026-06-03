from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def payload() -> dict:
    return {
        "thesis": {
            "useCase": "Equestrian event and long-hold land thesis",
            "market": "Charlotte-region Carolinas",
            "acreageRange": "50-300 acres",
            "budget": "$1.5M-$8M",
            "mustHaves": ["road frontage", "utility path", "defensible access"],
            "riskFactors": ["floodplain", "stale listing links"],
            "notes": "Prioritize source-aware candidates with clear next diligence.",
            "listingLinks": ["https://example.com/listing"],
        },
        "selectedOpportunityIds": ["york-kays-drive"],
        "shortlistedOpportunityIds": ["chester-humpback-bridge"],
    }


def test_parcel_research_fallback_without_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/api/parcel/research", json=payload())

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "fallback"
    assert body["normalizedThesis"]["market"] == "Charlotte-region Carolinas"
    assert body["rankedCandidateIds"]
    assert body["memo"]["executiveSummary"]
    assert body["memo"]["paidMemoScope"]
    assert body["sourceAudit"]
    assert body["toolEvents"]
    assert body["candidateSuitability"]
    assert body["candidateRecords"]
    assert body["candidateSuitability"][0]["category"] in {
        "strong_fit",
        "conditional_fit",
        "weak_fit",
        "disqualified",
        "needs_source_review",
    }
    assert "verified acquisition facts" in body["memo"]["sourceReadiness"]


def test_parcel_candidates_returns_seed_records():
    response = client.get("/api/parcel/candidates")

    assert response.status_code == 200
    records = response.json()["candidateRecords"]
    assert records
    assert records[0]["id"] == "york-kays-drive"
    assert records[0]["sourceStatus"] == "live"


def test_parcel_research_accepts_dynamic_candidate_inputs(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    body = payload()
    body["candidateInputs"] = [
        {
            "title": "User pasted 125 acre lead",
            "sourceUrl": "https://example.com/new-land-lead",
            "notes": "125 acres, $2.4M, road frontage, pasture, unknown zoning, possible wetlands.",
        }
    ]

    response = client.post("/api/parcel/research", json=body)

    assert response.status_code == 200
    result = response.json()
    dynamic_records = [item for item in result["candidateRecords"] if item["id"].startswith("user-")]
    assert dynamic_records
    dynamic = dynamic_records[0]
    assert dynamic["title"] == "User pasted 125 acre lead"
    assert dynamic["sourceStatus"] == "unknown"
    assert dynamic["sourceType"] == "manual"
    assert dynamic["acreage"] == 125
    assert dynamic["price"] == 2400000
    assert dynamic["id"] in result["rankedCandidateIds"]
    suitability = next(item for item in result["candidateSuitability"] if item["candidateId"] == dynamic["id"])
    assert suitability["category"] == "needs_source_review"
    source_audit = next(item for item in result["sourceAudit"] if item["candidateId"] == dynamic["id"])
    assert source_audit["status"] == "unknown"
    assert "No live scraping" in source_audit["note"]
    assert "verified" not in dynamic["verificationNote"].lower().replace("unverified", "")


def test_parcel_research_exposes_agentic_tool_trace(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/api/parcel/research", json=payload())

    assert response.status_code == 200
    body = response.json()
    tool_names = {item["toolName"] for item in body["toolEvents"]}
    assert "extract_project_thesis" in tool_names
    assert "score_property_suitability" in tool_names
    assert "audit_sources_and_missing_data" in tool_names
    suitability = body["candidateSuitability"][0]
    assert 0 <= suitability["suitabilityScore"] <= 100
    assert suitability["reasons"]
    assert suitability["nextQuestions"]


def test_parcel_research_includes_user_link_as_unverified_context(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/api/parcel/research", json=payload())

    assert response.status_code == 200
    source_audit = response.json()["sourceAudit"]
    link_row = next(item for item in source_audit if item["url"] == "https://example.com/listing")
    assert link_row["candidateId"] is None
    assert link_row["status"] == "unknown"
    assert "not scraped, verified, or guaranteed" in link_row["note"]


def test_parcel_research_validates_required_thesis():
    response = client.post("/api/parcel/research", json={"thesis": {"useCase": ""}})

    assert response.status_code == 422
