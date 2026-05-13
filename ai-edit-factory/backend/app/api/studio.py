from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app import db
from app.ai_editor import VideoMetadata, generate_edit_plan
from app.api.uploads import save_upload
from app.config import INPUTS_DIR, MAX_UPLOAD_MB, OUTPUTS_DIR
from app.media.audio import ALLOWED_AUDIO_EXTENSIONS, probe_audio_metadata
from app.media.rendering import render_studio_edit
from app.media.video import STUDIO_ALLOWED_VIDEO_EXTENSIONS, probe_video_metadata

router = APIRouter(prefix="/api/studio", tags=["ai clip studio"])


class StudioProjectCreate(BaseModel):
    name: str = Field(default="Untitled AI clip", min_length=1, max_length=100)


class EditPlanCreate(BaseModel):
    prompt: str = Field(min_length=3, max_length=1200)
    media_asset_id: int | None = None
    clip_type: str = Field(default="funny", max_length=80)
    add_music: bool = True
    add_captions: bool = True
    add_hashtags: bool = True


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
            "allowed_audio_types": sorted(ext.lstrip(".") for ext in ALLOWED_AUDIO_EXTENSIONS),
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


@router.post("/projects/{video_project_id}/music")
async def upload_music(
    video_project_id: int,
    rights_confirmed: bool = Form(...),
    file: UploadFile = File(...),
) -> dict:
    if not rights_confirmed:
        raise HTTPException(status_code=400, detail="Confirm that you own, licensed, or have permission to use this music before upload.")
    try:
        db.get_video_project(video_project_id)
        destination = INPUTS_DIR / f"studio_project_{video_project_id}" / "music"
        path = await save_upload(file, destination, ALLOWED_AUDIO_EXTENSIONS)
        metadata = probe_audio_metadata(path)
        preview_url = f"/media/inputs/{path.relative_to(INPUTS_DIR).as_posix()}"
        asset = db.add_video_project_asset(
            video_project_id,
            "music_audio",
            "upload",
            path=str(path),
            url=preview_url,
            duration=metadata.get("duration"),
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
        creative_prompt = (
            f"Type of clips: {payload.clip_type}. "
            f"Add music: {'yes' if payload.add_music else 'no'}. "
            f"Add captions: {'yes' if payload.add_captions else 'no'}. "
            f"Add hashtags: {'yes' if payload.add_hashtags else 'no'}. "
            f"Direction: {payload.prompt}"
        )
        plan = generate_edit_plan(creative_prompt, metadata)
        plan["clip_type"] = payload.clip_type
        plan["features"] = {
            "music": payload.add_music,
            "captions": payload.add_captions,
            "hashtags": payload.add_hashtags,
        }
        if not payload.add_captions:
            plan["text_overlays"] = []
            plan["caption_style"] = "captions disabled by the user"
        if not payload.add_hashtags:
            for package in plan.get("caption_packages", {}).values():
                package["hashtags"] = []
        if not payload.add_music:
            plan["music_vibe"] = "music disabled; preserve source audio when available"
        music_assets = db.list_video_project_assets(video_project_id, "music_audio")
        plan["music_asset_id"] = music_assets[-1]["id"] if payload.add_music and music_assets else None
        row = db.create_edit_plan(video_project_id, asset["id"], creative_prompt, plan)
        db.update_video_project(video_project_id, status="plan_ready", creative_prompt=creative_prompt)
        return _decode_plan(row)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _output_download_url(path: Path) -> str:
    return f"/media/outputs/{path.relative_to(OUTPUTS_DIR).as_posix()}"


def _run_studio_render(video_project_id: int, job_id: int, export_id: int, asset: dict, plan: dict, output_path: Path, music_asset: dict | None = None) -> None:
    try:
        db.update_render_job(job_id, "running", 10, "Rendering vertical MP4 with ffmpeg")
        db.update_video_project(video_project_id, status="rendering")
        music_path = music_asset.get("path") if music_asset else None
        render_studio_edit(asset["path"], plan, output_path, source_duration=asset.get("duration"), music_path=music_path)
        download_url = _output_download_url(output_path)
        db.update_render_job(job_id, "finished", 100, "Render complete", output_path=str(output_path))
        db.update_export(export_id, "ready", str(output_path), download_url)
        db.update_video_project(video_project_id, status="finished")
    except Exception as exc:  # noqa: BLE001 - persist clear render errors for UI.
        db.update_render_job(job_id, "failed", 100, "Render failed", str(exc), output_path=str(output_path))
        db.update_export(export_id, "failed", str(output_path), None)
        db.update_video_project(video_project_id, status="failed")


@router.post("/projects/{video_project_id}/render")
def create_render_job(video_project_id: int, background_tasks: BackgroundTasks) -> dict:
    try:
        project = db.get_video_project(video_project_id)
        plan = db.latest_edit_plan(video_project_id)
        if not plan:
            raise ValueError("Generate and review an edit plan before rendering.")
        assets = db.list_video_project_assets(video_project_id, "source_video")
        asset = next((item for item in assets if item["id"] == plan.get("media_asset_id")), assets[-1] if assets else None)
        if not asset or not asset.get("path"):
            raise ValueError("Upload a rights-confirmed source video before rendering.")
        plan_json = json.loads(plan["plan_json"])
        music_assets = db.list_video_project_assets(video_project_id, "music_audio")
        music_asset = None
        if plan_json.get("features", {}).get("music") and plan_json.get("music_asset_id"):
            music_asset = next((item for item in music_assets if item["id"] == plan_json.get("music_asset_id")), None)
        elif plan_json.get("features", {}).get("music") and music_assets:
            music_asset = music_assets[-1]
        platform = plan_json.get("platform", "tiktok")
        output_path = OUTPUTS_DIR / f"studio_project_{video_project_id}" / f"edit_plan_{plan['id']}_{platform}.mp4"
        message = "Render queued. The site will export a real vertical MP4 from your uploaded video%s." % (" and music" if music_asset else "")
        job = db.create_render_job(video_project_id, plan["id"], message, str(output_path), render_interface="ffmpeg")
        export = db.create_export(
            video_project_id,
            job["id"],
            plan["id"],
            platform,
            "rendering",
            str(output_path),
            None,
        )
        db.update_video_project(video_project_id, status="render_queued")
        background_tasks.add_task(_run_studio_render, video_project_id, job["id"], export["id"], asset, plan_json, output_path, music_asset)
        return {**job, "export": export, "project_status": project.get("status")}
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
