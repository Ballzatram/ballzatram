from __future__ import annotations

import os
from pathlib import Path

APP_MODE = os.getenv("APP_MODE", "development")
BASE_DIR = Path(os.getenv("AIEF_BASE_DIR", Path(__file__).resolve().parents[2]))
DATA_DIR = Path(os.getenv("AIEF_DATA_DIR", BASE_DIR / "data"))
INPUTS_DIR = Path(os.getenv("AIEF_INPUTS_DIR", BASE_DIR / "inputs"))
OUTPUTS_DIR = Path(os.getenv("AIEF_OUTPUTS_DIR", BASE_DIR / "outputs"))
FRONTEND_DIST_DIR = Path(os.getenv("AIEF_FRONTEND_DIST_DIR", BASE_DIR / "frontend_dist"))
DB_PATH = Path(os.getenv("AIEF_DB_PATH", DATA_DIR / "ai_edit_factory.sqlite3"))
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
ALLOW_YOUTUBE_DOWNLOADS = os.getenv("ALLOW_YOUTUBE_DOWNLOADS", "false").lower() == "true"
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "750"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if origin.strip()]

for directory in (DATA_DIR, INPUTS_DIR, OUTPUTS_DIR):
    directory.mkdir(parents=True, exist_ok=True)
