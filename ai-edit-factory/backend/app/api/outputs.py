from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app import db

router = APIRouter(prefix="/api/outputs", tags=["outputs"])


@router.get("/project/{project_id}")
def list_project_outputs(project_id: int) -> list[dict]:
    return db.list_outputs(project_id)


@router.get("/{output_id}/download")
def download_output(output_id: int) -> FileResponse:
    for project in db.list_projects():
        for output in db.list_outputs(project["id"]):
            if output["id"] == output_id:
                path = Path(output["path"])
                if not path.exists():
                    raise HTTPException(status_code=404, detail="Output file missing on disk")
                return FileResponse(path, media_type="video/mp4", filename=output["filename"])
    raise HTTPException(status_code=404, detail="Output not found")
