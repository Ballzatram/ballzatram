from __future__ import annotations

from pathlib import Path

from redis import Redis
from rq import Queue

from app import db
from app.config import OUTPUTS_DIR, REDIS_URL
from app.media.audio import detect_beats
from app.media.rendering import generate_edits, normalize_num_edits
from app.media.scene_detection import detect_candidate_clips
from app.media.scoring import score_candidate_clips


def queue() -> Queue:
    return Queue("ai-edit-factory", connection=Redis.from_url(REDIS_URL))


def enqueue_project(project_id: int, job_id: int) -> str:
    rq_job = queue().enqueue("app.jobs.process_project", project_id, job_id, job_timeout="2h", result_ttl=86400)
    db.set_job_rq_id(job_id, rq_job.id)
    return rq_job.id


def process_project(project_id: int, job_id: int) -> list[str]:
    try:
        db.update_project_status(project_id, "processing")
        db.update_job(job_id, "running", 5, "Loading project")
        project = db.get_project(project_id)
        songs = db.list_assets(project_id, "song")
        videos = db.list_assets(project_id, "video")
        if not songs:
            raise ValueError("Upload a song before generating edits.")
        if not videos:
            raise ValueError("Upload at least one video before generating edits.")
        song_path = Path(songs[-1]["path"])
        clips_dir = Path(videos[0]["path"]).parent
        db.update_job(job_id, "running", 15, "Detecting beats")
        beats = detect_beats(song_path, max_beats=90)
        db.update_job(job_id, "running", 30, "Detecting scenes")
        candidates = detect_candidate_clips(clips_dir)
        db.update_job(job_id, "running", 45, "Scoring clips")
        scored = score_candidate_clips(candidates)
        output_dir = OUTPUTS_DIR / f"project_{project_id}"

        def progress(index: int, total: int, message: str) -> None:
            db.update_job(job_id, "running", 50 + int((index / max(total, 1)) * 45), message)

        generated = generate_edits(
            song_path=song_path,
            beats=beats,
            candidates=scored,
            output_dir=output_dir,
            num_edits=normalize_num_edits(project["num_outputs"]),
            template=project["style_template"],
            progress=progress,
        )
        for item in generated:
            db.add_output(project_id, job_id, item.path, item.template, item.score)
        db.update_job(job_id, "finished", 100, f"Generated {len(generated)} edits")
        db.update_project_status(project_id, "finished")
        return [str(item.path) for item in generated]
    except Exception as exc:  # noqa: BLE001 - persist clear job error for UI.
        db.update_job(job_id, "failed", 100, "Generation failed", str(exc))
        db.update_project_status(project_id, "failed")
        raise
