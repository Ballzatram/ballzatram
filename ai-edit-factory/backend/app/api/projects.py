from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app import db
from app.config import INPUTS_DIR
from app.api.uploads import save_song_upload, save_video_upload
from app.jobs import start_project_job
from app.media.rendering import normalize_num_edits
from app.media.templates import normalize_template
from app.media.youtube import fetch_youtube_metadata

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(default="Untitled edit", min_length=1, max_length=100)
    style_template: str = "all"
    num_outputs: int = Field(default=10, ge=1, le=30)


class YouTubeImport(BaseModel):
    kind: str = Field(pattern="^(song|video)$")
    url: str


def project_payload(project_id: int) -> dict:
    project = db.get_project(project_id)
    return {
        **project,
        "assets": db.list_assets(project_id),
        "job": db.latest_job(project_id),
        "outputs": db.list_outputs(project_id),
    }


@router.get("")
def list_projects() -> list[dict]:
    return db.list_projects()


@router.post("")
def create_project(payload: ProjectCreate) -> dict:
    style = payload.style_template if payload.style_template == "all" else normalize_template(payload.style_template)
    return db.create_project(payload.name, style, normalize_num_edits(payload.num_outputs))


@router.get("/{project_id}")
def get_project(project_id: int) -> dict:
    try:
        return project_payload(project_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{project_id}/song")
async def upload_song(project_id: int, file: UploadFile = File(...)) -> dict:
    try:
        db.get_project(project_id)
        path = await save_song_upload(file, INPUTS_DIR / f"project_{project_id}" / "song")
        return db.add_asset(project_id, "song", "upload", path=str(path))
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{project_id}/videos")
async def upload_videos(project_id: int, files: list[UploadFile] = File(...)) -> list[dict]:
    try:
        db.get_project(project_id)
        saved = []
        for file in files:
            path = await save_video_upload(file, INPUTS_DIR / f"project_{project_id}" / "clips")
            saved.append(db.add_asset(project_id, "video", "upload", path=str(path)))
        return saved
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{project_id}/youtube")
def import_youtube_metadata(project_id: int, payload: YouTubeImport) -> dict:
    try:
        db.get_project(project_id)
        metadata = fetch_youtube_metadata(payload.url)
        return db.add_asset(
            project_id,
            payload.kind,
            "youtube_metadata",
            url=metadata.url,
            title=metadata.title,
            channel=metadata.channel,
            duration=metadata.duration,
            thumbnail=metadata.thumbnail,
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _validate_project_ready(project_id: int) -> None:
    songs = [asset for asset in db.list_assets(project_id, "song") if asset.get("path")]
    videos = [asset for asset in db.list_assets(project_id, "video") if asset.get("path")]
    if not songs:
        raise ValueError("Upload a song before generating edits.")
    if not videos:
        raise ValueError("Upload at least one video before generating edits.")
    missing = [asset["path"] for asset in [songs[-1], *videos] if not Path(asset["path"]).exists()]
    if missing:
        raise ValueError(f"Uploaded media is missing on disk: {', '.join(missing[:3])}")


@router.post("/{project_id}/generate")
def generate(project_id: int, background_tasks: BackgroundTasks) -> dict:
    try:
        db.get_project(project_id)
        _validate_project_ready(project_id)
        job = db.create_job(project_id)
        rq_job_id = start_project_job(project_id, job["id"], background_tasks)
        return {**job, "rq_job_id": rq_job_id}
    except Exception as exc:  # noqa: BLE001 - convert queue/project errors for UI.
        raise HTTPException(status_code=400, detail=str(exc)) from exc
