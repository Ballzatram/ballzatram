from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job(job_id: int) -> dict:
    try:
        return db.get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
