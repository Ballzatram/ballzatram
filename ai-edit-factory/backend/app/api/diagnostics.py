from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter
from redis import Redis
from redis.exceptions import RedisError
from rq import Queue

from app.config import APP_MODE, DB_PATH, FRONTEND_DIST_DIR, INPUTS_DIR, OUTPUTS_DIR, REDIS_URL

router = APIRouter(prefix="/api", tags=["diagnostics"])


def _path_writable(path: Path, is_file: bool = False) -> bool:
    target_dir = path.parent if is_file else path
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix="aief-write-", dir=target_dir, delete=False) as handle:
            handle.write(b"ok")
            temp_name = handle.name
        os.unlink(temp_name)
        return True
    except OSError:
        return False


@router.get("/diagnostics")
def diagnostics() -> dict:
    ffmpeg_available = shutil.which("ffmpeg") is not None
    ffprobe_available = shutil.which("ffprobe") is not None
    redis_available = False
    worker_queue_available = False
    queue_depth = None
    redis_error = None
    try:
        redis = Redis.from_url(REDIS_URL, socket_connect_timeout=0.5, socket_timeout=0.5)
        redis.ping()
        redis_available = True
        queue = Queue("ai-edit-factory", connection=redis)
        queue_depth = queue.count
        worker_queue_available = True
    except RedisError as exc:
        redis_error = str(exc)

    inputs_path_writable = _path_writable(INPUTS_DIR)
    outputs_path_writable = _path_writable(OUTPUTS_DIR)
    db_path_writable = _path_writable(DB_PATH, is_file=True)
    frontend_dist_detected = FRONTEND_DIST_DIR.exists()
    render_ready = ffmpeg_available and ffprobe_available and redis_available and worker_queue_available and inputs_path_writable and outputs_path_writable and db_path_writable and frontend_dist_detected
    return {
        "api_ok": True,
        "configured_app_mode": APP_MODE,
        "ffmpeg_available": ffmpeg_available,
        "ffprobe_available": ffprobe_available,
        "redis_available": redis_available,
        "worker_queue_available": worker_queue_available,
        "worker_queue_depth": queue_depth,
        "redis_error": redis_error,
        "inputs_path_writable": inputs_path_writable,
        "outputs_path_writable": outputs_path_writable,
        "db_path_writable": db_path_writable,
        "frontend_dist_detected": frontend_dist_detected,
        "app_mode": "full_stack_render_ready" if render_ready else "api_degraded",
    }
