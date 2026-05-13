from __future__ import annotations

import json
import re
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
    music_start_seconds: float | None = Field(default=None, ge=0, le=7200)


class EditFeedbackCreate(BaseModel):
    edit_plan_id: int | None = None
    export_id: int | None = None
    rating: int = Field(ge=1, le=5)
    signal: str = Field(default="manual", max_length=40)
    notes: str = Field(default="", max_length=500)


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
        "learning_profile": db.edit_learning_profile(video_project_id),
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
        ordered_assets = _ordered_source_assets(assets, payload.media_asset_id)
        asset = ordered_assets[0]
        total_duration = sum(_positive_duration(item, 0.0) for item in ordered_assets) or asset.get("duration")
        metadata = VideoMetadata(
            duration=total_duration,
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
        music_assets = db.list_video_project_assets(video_project_id, "music_audio")
        selected_music = music_assets[-1] if payload.add_music and music_assets else None
        plan = generate_edit_plan(creative_prompt, metadata, db.edit_learning_profile(video_project_id), selected_music.get("duration") if selected_music else None)
        plan["clip_type"] = payload.clip_type
        plan["features"] = {
            "music": payload.add_music,
            "captions": payload.add_captions,
            "hashtags": payload.add_hashtags,
        }
        _annotate_splice_segments(plan, ordered_assets)
        if not payload.add_captions:
            plan["text_overlays"] = []
            plan["caption_style"] = "captions disabled by the user"
        if not payload.add_hashtags:
            for package in plan.get("caption_packages", {}).values():
                package["hashtags"] = []
        if not payload.add_music:
            plan["music_vibe"] = "music disabled; preserve source audio for one source, or use silent AAC for multi-source splices"
            plan["music_start_seconds"] = 0.0
        elif payload.music_start_seconds is not None:
            plan["music_start_seconds"] = round(float(payload.music_start_seconds), 2)
        plan["music_asset_id"] = selected_music["id"] if selected_music else None
        row = db.create_edit_plan(video_project_id, asset["id"], creative_prompt, plan)
        db.update_video_project(video_project_id, status="plan_ready", creative_prompt=creative_prompt)
        return _decode_plan(row)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc



def _ordered_source_assets(assets: list[dict], selected_asset_id: int | None) -> list[dict]:
    if not assets:
        return []
    selected = next((item for item in assets if item["id"] == selected_asset_id), assets[-1])
    return [selected, *[item for item in assets if item["id"] != selected["id"]]]


def _positive_duration(asset: dict, fallback: float = 6.0) -> float:
    try:
        duration = float(asset.get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0.0
    return duration if duration > 0 else fallback


def _annotate_splice_segments(plan: dict, source_assets: list[dict]) -> None:
    if not source_assets:
        return
    raw_segments = plan.get("segments") or []
    if not raw_segments:
        raw_segments = [{"source_start": 0, "source_end": min(6.0, _positive_duration(source_assets[0])), "reason": "opens with the strongest uploaded clip"}]
    annotated: list[dict] = []
    for index, segment in enumerate(raw_segments):
        asset = source_assets[index % len(source_assets)]
        source_duration = _positive_duration(asset)
        requested_duration = max(0.8, float(segment.get("source_end", 3) or 3) - float(segment.get("source_start", 0) or 0))
        segment_duration = min(requested_duration, source_duration)
        max_start = max(0.0, source_duration - segment_duration)
        local_start = round(min(max_start, (index * 1.7) % (max_start + 0.001 if max_start else 1)), 2)
        annotated.append({
            **segment,
            "source_asset_id": asset["id"],
            "source_filename": asset.get("original_filename") or Path(str(asset.get("path", "uploaded clip"))).name,
            "source_start": local_start,
            "source_end": round(local_start + segment_duration, 2),
        })
    plan["segments"] = annotated
    plan["source_mode"] = "uploaded_splice"
    plan["source_asset_ids"] = [asset["id"] for asset in source_assets]
    plan["source_asset_count"] = len(source_assets)


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "ai-edit"

def _output_download_url(path: Path) -> str:
    return f"/media/outputs/{path.relative_to(OUTPUTS_DIR).as_posix()}"


def _run_studio_render(video_project_id: int, job_id: int, export_id: int, asset: dict, plan: dict, output_path: Path, music_asset: dict | None = None, source_assets: list[dict] | None = None) -> None:
    try:
        db.update_render_job(job_id, "running", 10, "Rendering vertical MP4 with ffmpeg")
        db.update_video_project(video_project_id, status="rendering")
        music_path = music_asset.get("path") if music_asset else None
        render_studio_edit(asset["path"], plan, output_path, source_duration=asset.get("duration"), music_path=music_path, source_assets=source_assets)
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
        plan_json = json.loads(plan["plan_json"])
        source_asset_ids = plan_json.get("source_asset_ids") or []
        source_assets = [item for item in assets if item["id"] in source_asset_ids] if source_asset_ids else assets
        asset = next((item for item in assets if item["id"] == plan.get("media_asset_id")), source_assets[0] if source_assets else None)
        if not asset or not asset.get("path"):
            raise ValueError("Upload a rights-confirmed source video before rendering.")
        music_assets = db.list_video_project_assets(video_project_id, "music_audio")
        music_asset = None
        if plan_json.get("features", {}).get("music") and plan_json.get("music_asset_id"):
            music_asset = next((item for item in music_assets if item["id"] == plan_json.get("music_asset_id")), None)
        elif plan_json.get("features", {}).get("music") and music_assets:
            music_asset = music_assets[-1]
        platform = plan_json.get("platform", "tiktok")
        output_path = OUTPUTS_DIR / f"studio_project_{video_project_id}" / f"{_slug(project.get('name') or 'ai-edit')}_plan_{plan['id']}_{platform}.mp4"
        video_label = "videos" if len(source_assets) > 1 else "video"
        message = "Render queued. The site will export a real vertical MP4 by splicing your uploaded %s%s." % (video_label, " and music" if music_asset else "")
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
        background_tasks.add_task(_run_studio_render, video_project_id, job["id"], export["id"], asset, plan_json, output_path, music_asset, source_assets)
        return {**job, "export": export, "project_status": project.get("status")}
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/projects/{video_project_id}/feedback")
def create_feedback(video_project_id: int, payload: EditFeedbackCreate) -> dict:
    try:
        db.get_video_project(video_project_id)
        feedback = db.create_edit_feedback(video_project_id, payload.edit_plan_id, payload.export_id, payload.rating, payload.signal, payload.notes)
        return {"feedback": feedback, "learning_profile": db.edit_learning_profile(video_project_id)}
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
