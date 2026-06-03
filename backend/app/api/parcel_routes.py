from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import ParcelResearchRequest, ParcelResearchResponse
from app.services.parcel_research import build_parcel_research

router = APIRouter(prefix="/parcel", tags=["parcel"])


@router.post("/research", response_model=ParcelResearchResponse)
def parcel_research(req: ParcelResearchRequest) -> dict:
    try:
        return build_parcel_research(req)
    except Exception as exc:  # noqa: BLE001 - route should return a useful API error envelope.
        raise HTTPException(status_code=400, detail=str(exc)) from exc
