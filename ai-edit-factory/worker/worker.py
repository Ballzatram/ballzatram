from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from redis import Redis  # noqa: E402
from rq import Worker  # noqa: E402

from app.config import REDIS_URL  # noqa: E402
from app.db import init_db  # noqa: E402

if __name__ == "__main__":
    init_db()
    worker = Worker(["ai-edit-factory"], connection=Redis.from_url(REDIS_URL))
    worker.work(with_scheduler=False)
