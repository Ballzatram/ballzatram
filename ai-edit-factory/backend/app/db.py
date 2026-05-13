from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from app.config import DB_PATH

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_platform TEXT NOT NULL DEFAULT 'tiktok',
  status TEXT NOT NULL DEFAULT 'created',
  style_template TEXT NOT NULL DEFAULT 'fast_cut',
  num_outputs INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL,
  path TEXT,
  url TEXT,
  title TEXT,
  channel TEXT,
  duration REAL,
  thumbnail TEXT,
  thumbnail_path TEXT,
  width INTEGER,
  height INTEGER,
  fps REAL,
  has_audio INTEGER NOT NULL DEFAULT 0,
  analysis_json TEXT NOT NULL DEFAULT '{}',
  file_type TEXT,
  bytes INTEGER,
  original_filename TEXT,
  preview_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  rq_job_id TEXT,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  job_id INTEGER,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  template TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS video_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  creative_prompt TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_project_id INTEGER NOT NULL,
  media_asset_id INTEGER,
  text TEXT NOT NULL DEFAULT '',
  segments_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  FOREIGN KEY(video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS edit_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_project_id INTEGER NOT NULL,
  media_asset_id INTEGER,
  prompt TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL,
  FOREIGN KEY(video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS render_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_project_id INTEGER NOT NULL,
  edit_plan_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  render_interface TEXT NOT NULL DEFAULT 'ffmpeg',
  output_path TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(edit_plan_id) REFERENCES edit_plans(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_project_id INTEGER NOT NULL,
  render_job_id INTEGER,
  edit_plan_id INTEGER,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  path TEXT,
  download_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(render_job_id) REFERENCES render_jobs(id) ON DELETE SET NULL,
  FOREIGN KEY(edit_plan_id) REFERENCES edit_plans(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS edit_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_project_id INTEGER NOT NULL,
  edit_plan_id INTEGER,
  export_id INTEGER,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  signal TEXT NOT NULL DEFAULT 'manual',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(edit_plan_id) REFERENCES edit_plans(id) ON DELETE SET NULL,
  FOREIGN KEY(export_id) REFERENCES exports(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS trend_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  format_name TEXT NOT NULL UNIQUE,
  hook_style TEXT NOT NULL,
  pacing_style TEXT NOT NULL,
  caption_style TEXT NOT NULL,
  music_guidance TEXT NOT NULL,
  hashtags TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'general',
  region TEXT NOT NULL DEFAULT 'US',
  freshness_score REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  video_project_id INTEGER,
  edit_plan_id INTEGER,
  export_id INTEGER,
  event_type TEXT NOT NULL,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  notes TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(video_project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(edit_plan_id) REFERENCES edit_plans(id) ON DELETE SET NULL,
  FOREIGN KEY(export_id) REFERENCES exports(id) ON DELETE SET NULL
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def dict_factory(cursor: sqlite3.Cursor, row: sqlite3.Row) -> dict:
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        for column, definition in {
            "description": "TEXT NOT NULL DEFAULT ''",
            "target_platform": "TEXT NOT NULL DEFAULT 'tiktok'",
        }.items():
            _ensure_column(conn, "projects", column, definition)
        for column, definition in {
            "asset_type": "TEXT NOT NULL DEFAULT ''",
            "thumbnail_path": "TEXT",
            "width": "INTEGER",
            "height": "INTEGER",
            "fps": "REAL",
            "has_audio": "INTEGER NOT NULL DEFAULT 0",
            "analysis_json": "TEXT NOT NULL DEFAULT '{}'",
            "file_type": "TEXT",
            "bytes": "INTEGER",
            "original_filename": "TEXT",
            "preview_url": "TEXT",
        }.items():
            _ensure_column(conn, "media_assets", column, definition)
        for column, definition in {
            "event_type": "TEXT NOT NULL DEFAULT 'other'",
            "metadata_json": "TEXT NOT NULL DEFAULT '{}'",
        }.items():
            _ensure_column(conn, "edit_feedback", column, definition)
        seed_trend_signals(conn)


def create_project(name: str, style_template: str, num_outputs: int, description: str = "", target_platform: str = "tiktok") -> dict:
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO projects (name, description, target_platform, style_template, num_outputs, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name, description, target_platform, style_template, num_outputs, ts, ts),
        )
        return get_project(cur.lastrowid, conn)


def get_project(project_id: int, conn: sqlite3.Connection | None = None) -> dict:
    owns = conn is None
    if owns:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = dict_factory
    try:
        row = conn.execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
        if row is None:
            raise KeyError(f"Project not found: {project_id}")
        return row
    finally:
        if owns:
            conn.close()


def list_projects() -> list[dict]:
    with connect() as conn:
        return conn.execute("SELECT * FROM projects ORDER BY id DESC").fetchall()


def update_project_status(project_id: int, status: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE projects SET status=?, updated_at=? WHERE id=?", (status, now_iso(), project_id))


def add_asset(project_id: int, kind: str, source_type: str, **fields: object) -> dict:
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO media_assets
            (project_id, kind, asset_type, source_type, path, url, title, channel, duration, thumbnail, thumbnail_path, width, height, fps, has_audio, analysis_json, file_type, bytes, original_filename, preview_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                project_id,
                kind,
                str(fields.get("asset_type") or kind),
                source_type,
                fields.get("path"),
                fields.get("url"),
                fields.get("title"),
                fields.get("channel"),
                fields.get("duration"),
                fields.get("thumbnail"),
                fields.get("thumbnail_path") or fields.get("thumbnail"),
                fields.get("width"),
                fields.get("height"),
                fields.get("fps"),
                1 if fields.get("has_audio") else 0,
                json.dumps(fields.get("analysis_json") or {}),
                fields.get("file_type"),
                fields.get("bytes"),
                fields.get("original_filename"),
                fields.get("preview_url"),
                ts,
            ),
        )
        return conn.execute("SELECT * FROM media_assets WHERE id=?", (cur.lastrowid,)).fetchone()


def list_assets(project_id: int, kind: str | None = None) -> list[dict]:
    with connect() as conn:
        if kind:
            return conn.execute("SELECT * FROM media_assets WHERE project_id=? AND kind=? ORDER BY id", (project_id, kind)).fetchall()
        return conn.execute("SELECT * FROM media_assets WHERE project_id=? ORDER BY id", (project_id,)).fetchall()


def create_job(project_id: int) -> dict:
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO jobs (project_id, status, progress, message, created_at, updated_at) VALUES (?, 'queued', 0, 'Queued', ?, ?)",
            (project_id, ts, ts),
        )
        return conn.execute("SELECT * FROM jobs WHERE id=?", (cur.lastrowid,)).fetchone()


def set_job_rq_id(job_id: int, rq_job_id: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE jobs SET rq_job_id=?, updated_at=? WHERE id=?", (rq_job_id, now_iso(), job_id))


def update_job(job_id: int, status: str, progress: int, message: str = "", error: str | None = None) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE jobs SET status=?, progress=?, message=?, error=?, updated_at=? WHERE id=?",
            (status, max(0, min(100, progress)), message, error, now_iso(), job_id),
        )


def get_job(job_id: int) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(f"Job not found: {job_id}")
        return row


def latest_job(project_id: int) -> dict | None:
    with connect() as conn:
        return conn.execute("SELECT * FROM jobs WHERE project_id=? ORDER BY id DESC LIMIT 1", (project_id,)).fetchone()


def add_output(project_id: int, job_id: int, path: Path, template: str, score: float) -> dict:
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO outputs (project_id, job_id, path, filename, template, score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (project_id, job_id, str(path), path.name, template, score, ts),
        )
        return conn.execute("SELECT * FROM outputs WHERE id=?", (cur.lastrowid,)).fetchone()


def list_outputs(project_id: int) -> list[dict]:
    with connect() as conn:
        return conn.execute("SELECT * FROM outputs WHERE project_id=? ORDER BY score DESC, id", (project_id,)).fetchall()


def create_video_project(name: str) -> dict:
    legacy = create_project(name, "all", 1)
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO video_projects (project_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (legacy["id"], name, ts, ts),
        )
        return get_video_project(cur.lastrowid, conn)


def get_video_project(video_project_id: int, conn: sqlite3.Connection | None = None) -> dict:
    owns = conn is None
    if owns:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = dict_factory
    try:
        row = conn.execute("SELECT * FROM video_projects WHERE id=?", (video_project_id,)).fetchone()
        if row is None:
            raise KeyError(f"Video project not found: {video_project_id}")
        return row
    finally:
        if owns:
            conn.close()


def list_video_projects() -> list[dict]:
    with connect() as conn:
        return conn.execute("SELECT * FROM video_projects ORDER BY id DESC").fetchall()


def update_video_project(video_project_id: int, status: str | None = None, creative_prompt: str | None = None) -> None:
    project = get_video_project(video_project_id)
    next_status = status or project["status"]
    next_prompt = creative_prompt if creative_prompt is not None else project.get("creative_prompt")
    with connect() as conn:
        conn.execute(
            "UPDATE video_projects SET status=?, creative_prompt=?, updated_at=? WHERE id=?",
            (next_status, next_prompt, now_iso(), video_project_id),
        )


def add_video_project_asset(video_project_id: int, kind: str, source_type: str, **fields: object) -> dict:
    video_project = get_video_project(video_project_id)
    return add_asset(video_project["project_id"], kind, source_type, **fields)


def list_video_project_assets(video_project_id: int, kind: str | None = None) -> list[dict]:
    video_project = get_video_project(video_project_id)
    return list_assets(video_project["project_id"], kind)


def create_edit_plan(video_project_id: int, media_asset_id: int | None, prompt: str, plan: dict) -> dict:
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO edit_plans (video_project_id, media_asset_id, prompt, plan_json, status, created_at) VALUES (?, ?, ?, ?, 'ready', ?)",
            (video_project_id, media_asset_id, prompt, json.dumps(plan), ts),
        )
        return conn.execute("SELECT * FROM edit_plans WHERE id=?", (cur.lastrowid,)).fetchone()


def latest_edit_plan(video_project_id: int) -> dict | None:
    with connect() as conn:
        return conn.execute("SELECT * FROM edit_plans WHERE video_project_id=? ORDER BY id DESC LIMIT 1", (video_project_id,)).fetchone()


def create_render_job(video_project_id: int, edit_plan_id: int | None, message: str, output_path: str | None = None, render_interface: str = 'ffmpeg') -> dict:
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO render_jobs
            (video_project_id, edit_plan_id, status, progress, message, render_interface, output_path, created_at, updated_at)
            VALUES (?, ?, 'pending', 0, ?, ?, ?, ?, ?)""",
            (video_project_id, edit_plan_id, message, render_interface, output_path, ts, ts),
        )
        return conn.execute("SELECT * FROM render_jobs WHERE id=?", (cur.lastrowid,)).fetchone()


def latest_render_job(video_project_id: int) -> dict | None:
    with connect() as conn:
        return conn.execute("SELECT * FROM render_jobs WHERE video_project_id=? ORDER BY id DESC LIMIT 1", (video_project_id,)).fetchone()


def create_export(video_project_id: int, render_job_id: int | None, edit_plan_id: int | None, platform: str, status: str, path: str | None, download_url: str | None) -> dict:
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO exports (video_project_id, render_job_id, edit_plan_id, platform, status, path, download_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (video_project_id, render_job_id, edit_plan_id, platform, status, path, download_url, ts),
        )
        return conn.execute("SELECT * FROM exports WHERE id=?", (cur.lastrowid,)).fetchone()


def list_exports(video_project_id: int) -> list[dict]:
    with connect() as conn:
        return conn.execute("SELECT * FROM exports WHERE video_project_id=? ORDER BY id DESC", (video_project_id,)).fetchall()



def create_edit_feedback(video_project_id: int, edit_plan_id: int | None, export_id: int | None, rating: int, signal: str = "manual", notes: str = "") -> dict:
    if rating < 1 or rating > 5:
        raise ValueError("Feedback rating must be between 1 and 5.")
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO edit_feedback (video_project_id, edit_plan_id, export_id, rating, signal, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (video_project_id, edit_plan_id, export_id, rating, signal[:40], notes[:500], ts),
        )
        return conn.execute("SELECT * FROM edit_feedback WHERE id=?", (cur.lastrowid,)).fetchone()


def edit_learning_profile(video_project_id: int | None = None) -> dict:
    where = "WHERE video_project_id=?" if video_project_id else ""
    params = (video_project_id,) if video_project_id else ()
    with connect() as conn:
        rows = conn.execute(f"SELECT rating, signal FROM edit_feedback {where} ORDER BY id DESC LIMIT 200", params).fetchall()
    if not rows:
        return {"sample_size": 0, "average_rating": None, "recommended_pacing": "balanced", "caption_density": "standard"}
    average = sum(row["rating"] for row in rows) / len(rows)
    low = sum(1 for row in rows if row["rating"] <= 2)
    high = sum(1 for row in rows if row["rating"] >= 4)
    return {
        "sample_size": len(rows),
        "average_rating": round(average, 2),
        "recommended_pacing": "faster" if low >= high and len(rows) >= 3 else "balanced",
        "caption_density": "high" if high > low else "standard",
    }


def list_edit_plans(video_project_id: int) -> list[dict]:
    with connect() as conn:
        return conn.execute("SELECT * FROM edit_plans WHERE video_project_id=? ORDER BY id DESC", (video_project_id,)).fetchall()


def get_edit_plan(edit_plan_id: int) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM edit_plans WHERE id=?", (edit_plan_id,)).fetchone()
        if row is None:
            raise KeyError(f"Edit plan not found: {edit_plan_id}")
        return row


def update_edit_plan(edit_plan_id: int, plan: dict) -> dict:
    with connect() as conn:
        conn.execute("UPDATE edit_plans SET plan_json=? WHERE id=?", (json.dumps(plan), edit_plan_id))
        return conn.execute("SELECT * FROM edit_plans WHERE id=?", (edit_plan_id,)).fetchone()


def seed_trend_signals(conn: sqlite3.Connection) -> None:
    ts = now_iso()
    rows = [
        ("Fast montage", "open on motion or transformation", "0.6-1.2s cuts with early pattern breaks", "big hook, sparse punch captions", "start near a beat/drop; keep volume under captions", ["#fyp", "#edit", "#beforeafter"], "general", "US", 0.86),
        ("Hook buildup reveal", "promise payoff in first second", "slower setup then quick reveal cuts", "question hook + reveal label", "use risers or a recognizable chorus section", ["#waitforit", "#reveal", "#storytime"], "story", "US", 0.82),
        ("Beat-sync cuts", "visual hit on first beat", "cut exactly on beat grid", "minimal captions; let rhythm lead", "choose a high-energy section and duck source audio", ["#beatsync", "#transition", "#viral"], "music", "US", 0.78),
    ]
    for row in rows:
        conn.execute(
            """INSERT OR IGNORE INTO trend_signals
            (format_name, hook_style, pacing_style, caption_style, music_guidance, hashtags, category, region, freshness_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (*row[:5], json.dumps(row[5]), *row[6:], ts),
        )


def list_trend_signals() -> list[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM trend_signals ORDER BY freshness_score DESC, format_name").fetchall()
    for row in rows:
        try:
            row["hashtags"] = json.loads(row.get("hashtags") or "[]")
        except json.JSONDecodeError:
            row["hashtags"] = []
    return rows


def create_feedback_event(video_project_id: int, edit_plan_id: int | None, export_id: int | None, event_type: str, rating: int | None, notes: str = "", metadata: dict | None = None) -> dict:
    video_project = get_video_project(video_project_id)
    if rating is not None and (rating < 1 or rating > 5):
        raise ValueError("Feedback rating must be between 1 and 5.")
    allowed = {"works", "needs_tighter_cuts", "wrong_music_section", "bad_captions", "bad_crop", "other"}
    if event_type not in allowed:
        raise ValueError(f"Unsupported feedback event_type. Allowed: {', '.join(sorted(allowed))}")
    ts = now_iso()
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO feedback_events
            (project_id, video_project_id, edit_plan_id, export_id, event_type, rating, notes, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (video_project["project_id"], video_project_id, edit_plan_id, export_id, event_type, rating, notes[:500], json.dumps(metadata or {}), ts),
        )
        conn.execute(
            "INSERT INTO edit_feedback (video_project_id, edit_plan_id, export_id, rating, signal, notes, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (video_project_id, edit_plan_id, export_id, rating or (5 if event_type == "works" else 2), event_type[:40], notes[:500], event_type, json.dumps(metadata or {}), ts),
        )
        return conn.execute("SELECT * FROM feedback_events WHERE id=?", (cur.lastrowid,)).fetchone()

def update_render_job(render_job_id: int, status: str, progress: int, message: str = "", error: str | None = None, output_path: str | None = None) -> None:
    with connect() as conn:
        existing = conn.execute("SELECT output_path FROM render_jobs WHERE id=?", (render_job_id,)).fetchone()
        next_output_path = output_path if output_path is not None else (existing or {}).get("output_path")
        conn.execute(
            "UPDATE render_jobs SET status=?, progress=?, message=?, error=?, output_path=?, updated_at=? WHERE id=?",
            (status, max(0, min(100, progress)), message, error, next_output_path, now_iso(), render_job_id),
        )


def update_export(export_id: int, status: str, path: str | None = None, download_url: str | None = None) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE exports SET status=?, path=?, download_url=? WHERE id=?",
            (status, path, download_url, export_id),
        )
