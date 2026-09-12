from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from app.api.ai_credentials import user_openai_key

from app.models.schemas import ParcelCandidateListResponse, ParcelResearchRequest, ParcelResearchResponse
from app.services.parcel_research import build_parcel_research, get_seed_candidate_records

router = APIRouter(prefix="/parcel", tags=["parcel"])


@router.post("/research", response_model=ParcelResearchResponse)
def parcel_research(req: ParcelResearchRequest, api_key: str | None = Depends(user_openai_key)) -> dict:
    try:
        return build_parcel_research(req, api_key=api_key)
    except Exception as exc:  # noqa: BLE001 - route should return a useful API error envelope.
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/candidates", response_model=ParcelCandidateListResponse)
def parcel_candidates() -> dict:
    return {"candidateRecords": get_seed_candidate_records()}
