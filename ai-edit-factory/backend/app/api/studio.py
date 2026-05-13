from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app import db
from app.ai_editor import VideoMetadata, generate_edit_plan
from app.api.uploads import save_upload
from app.config import INPUTS_DIR, MAX_UPLOAD_MB, OUTPUTS_DIR
from app.media.video import STUDIO_ALLOWED_VIDEO_EXTENSIONS, probe_video_metadata

router = APIRouter(prefix="/api/studio", tags=["ai clip studio"])


class StudioProjectCreate(BaseModel):
    name: str = Field(default="Untitled AI clip", min_length=1, max_length=100)


class EditPlanCreate(BaseModel):
    prompt: str = Field(min_length=3, max_length=1200)
    media_asset_id: int | None = None


def _decode_plan(row: dict | None) -> dict | None:
    if not row:
        return None
    return {**row, "plan": json.loads(row["plan_json"])}


def _payload(video_project_id: int) -> dict:
    project = db.get_video_project(video_project_id)
    assets = db.list_video_project_assets(video_project_id)
    return {
        **project,
        "assets": assets,
        "edit_plan": _decode_plan(db.latest_edit_plan(video_project_id)),
        "render_job": db.latest_render_job(video_project_id),
        "exports": db.list_exports(video_project_id),
        "limits": {
            "max_upload_mb": MAX_UPLOAD_MB,
            "allowed_video_types": sorted(ext.lstrip(".") for ext in STUDIO_ALLOWED_VIDEO_EXTENSIONS),
        },
    }


@router.get("/projects")
def list_projects() -> list[dict]:
    return db.list_video_projects()


@router.post("/projects")
def create_project(payload: StudioProjectCreate) -> dict:
    project = db.create_video_project(payload.name)
    return _payload(project["id"])


@router.get("/projects/{video_project_id}")
def get_project(video_project_id: int) -> dict:
    try:
        return _payload(video_project_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/projects/{video_project_id}/video")
async def upload_video(
    video_project_id: int,
    rights_confirmed: bool = Form(...),
    file: UploadFile = File(...),
) -> dict:
    if not rights_confirmed:
        raise HTTPException(status_code=400, detail="Confirm that you own, licensed, or have permission to use this video before upload.")
    try:
        db.get_video_project(video_project_id)
        destination = INPUTS_DIR / f"studio_project_{video_project_id}" / "source"
        path = await save_upload(file, destination, STUDIO_ALLOWED_VIDEO_EXTENSIONS)
        metadata = probe_video_metadata(path)
        preview_url = f"/media/inputs/{path.relative_to(INPUTS_DIR).as_posix()}"
        asset = db.add_video_project_asset(
            video_project_id,
            "source_video",
            "upload",
            path=str(path),
            url=preview_url,
            duration=metadata.get("duration"),
            width=metadata.get("width"),
            height=metadata.get("height"),
            file_type=metadata.get("file_type"),
            bytes=path.stat().st_size,
            original_filename=file.filename,
            preview_url=preview_url,
        )
        db.update_video_project(video_project_id, status="media_uploaded")
        return asset
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/projects/{video_project_id}/edit-plans")
def create_edit_plan(video_project_id: int, payload: EditPlanCreate) -> dict:
    try:
        db.get_video_project(video_project_id)
        assets = db.list_video_project_assets(video_project_id, "source_video")
        if not assets:
            raise ValueError("Upload a rights-confirmed source video before generating an edit plan.")
        asset = next((item for item in assets if item["id"] == payload.media_asset_id), assets[-1])
        metadata = VideoMetadata(
            duration=asset.get("duration"),
            width=asset.get("width"),
            height=asset.get("height"),
            file_type=asset.get("file_type"),
        )
        plan = generate_edit_plan(payload.prompt, metadata)
        row = db.create_edit_plan(video_project_id, asset["id"], payload.prompt, plan)
        db.update_video_project(video_project_id, status="plan_ready", creative_prompt=payload.prompt)
        return _decode_plan(row)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/projects/{video_project_id}/render")
def create_render_job(video_project_id: int) -> dict:
    try:
        project = db.get_video_project(video_project_id)
        plan = db.latest_edit_plan(video_project_id)
        if not plan:
            raise ValueError("Generate and review an edit plan before rendering.")
        plan_json = json.loads(plan["plan_json"])
        output_path = OUTPUTS_DIR / f"studio_project_{video_project_id}" / f"planned_{plan['id']}_{plan_json.get('platform', 'short')}.mp4"
        message = "Render job created with stub renderer. TODO: connect this clean interface to the ffmpeg render pipeline."
        job = db.create_render_job(video_project_id, plan["id"], message, str(output_path))
        export = db.create_export(
            video_project_id,
            job["id"],
            plan["id"],
            plan_json.get("platform", "tiktok"),
            "pending_render",
            str(output_path),
            None,
        )
        db.update_video_project(video_project_id, status="render_pending")
        return {**job, "export": export, "project_status": project.get("status")}
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
