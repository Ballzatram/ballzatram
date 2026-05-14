from __future__ import annotations

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import db
from app.api.diagnostics import router as diagnostics_router
from app.api.jobs import router as jobs_router
from app.api.outputs import router as outputs_router
from app.api.projects import router as projects_router
from app.api.studio import router as studio_router
from app.config import CORS_ORIGINS, FRONTEND_DIST_DIR, INPUTS_DIR, OUTPUTS_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ai-edit-factory")

app = FastAPI(title="ai-edit-factory", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(diagnostics_router)
app.include_router(projects_router)
app.include_router(studio_router)
app.include_router(jobs_router)
app.include_router(outputs_router)
app.mount("/media/outputs", StaticFiles(directory=OUTPUTS_DIR), name="media-outputs")
app.mount("/media/inputs", StaticFiles(directory=INPUTS_DIR), name="media-inputs")
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")
app.mount("/inputs", StaticFiles(directory=INPUTS_DIR), name="inputs")


@app.on_event("startup")
def startup() -> None:
    db.init_db()
    logger.info("ai-edit-factory API started")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


# Keep frontend mounts last so API routes, media, and health checks always win.
if FRONTEND_DIST_DIR.exists():
    app.mount("/ai-edit-factory", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="ai-edit-factory")
    # Preserve direct-container/local behavior where the tool is opened at the API origin root.
    app.mount("/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="site")
else:
    logger.warning("Frontend build not found at %s; API-only mode enabled", FRONTEND_DIST_DIR)
