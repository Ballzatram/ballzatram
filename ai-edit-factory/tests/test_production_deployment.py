from pathlib import Path
import re
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent


def test_production_compose_declares_backed_site_stack() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()

    assert "api:" in compose
    assert "worker:" in compose
    assert "redis:" in compose
    assert "caddy:" in compose
    assert "./inputs:/app/inputs" in compose
    assert "./outputs:/app/outputs" in compose
    assert "./data:/app/data" in compose
    assert '"8000"' in compose
    assert '"8000:8000"' not in compose
    assert "python /app/worker/worker.py" in compose
    assert "PYTHONPATH: /app/backend" in compose
    assert "working_dir: /app/backend" in compose
    assert "../:/srv/ballzatram:ro" in compose


def test_caddy_serves_launchpad_and_routes_ai_edit_to_api() -> None:
    caddyfile = (ROOT / "deploy/caddy/Caddyfile").read_text()

    assert "ballzatram.com" in caddyfile
    assert "root * /srv/ballzatram" in caddyfile
    assert "@api path /api/*" in caddyfile
    assert "@media path /media/*" in caddyfile
    assert "@outputs path /outputs/*" in caddyfile
    assert "@inputs path /inputs/*" in caddyfile
    assert "@aiEdit path /ai-edit-factory /ai-edit-factory/*" in caddyfile
    assert "reverse_proxy api:8000" in caddyfile
    assert "file_server" in caddyfile
    assert "max_size 750MB" in caddyfile
    assert "response_header_timeout 300s" in caddyfile
    assert "@assets path /assets/*" not in caddyfile
    assert not re.search(r"handle\s*\{\s*reverse_proxy\s+api:8000", caddyfile)


def test_root_homepage_links_to_ai_edit_factory_subpath() -> None:
    html = (REPO_ROOT / "index.html").read_text()

    assert 'href="/ai-edit-factory/"' in html
    assert 'href="ai-edit-factory/index.html"' not in html


def test_production_env_example_and_verify_script_cover_diagnostics() -> None:
    env = (ROOT / ".env.production.example").read_text()
    script = (ROOT / "scripts/verify_production.sh").read_text()

    for line in [
        "APP_MODE=production",
        "REDIS_URL=redis://redis:6379/0",
        "AIEF_BASE_DIR=/app",
        "AIEF_DB_PATH=/app/data/ai_edit_factory.sqlite3",
        "CORS_ORIGINS=https://ballzatram.com",
        "ALLOW_YOUTUBE_DOWNLOADS=false",
        "MAX_UPLOAD_MB=750",
    ]:
        assert line in env

    for field in [
        "api_ok",
        "ffmpeg_available",
        "ffprobe_available",
        "redis_available",
        "worker_queue_available",
        "inputs_path_writable",
        "outputs_path_writable",
        "db_path_writable",
        "full_stack_render_ready",
    ]:
        assert field in script


def test_deployment_docs_make_static_preview_non_production() -> None:
    docs = (ROOT / "docs/DEPLOYMENT.md").read_text()

    assert "https://ballzatram.com/api/diagnostics" in docs
    assert "Static-only hosting of AI Edit is preview-only" in docs
    assert "docker compose -f docker-compose.prod.yml up -d --build" in docs
    assert "./scripts/verify_production.sh https://ballzatram.com" in docs
    assert "backend settings, API-origin fields, diagnostics panels, or debug controls" in docs


def test_frontend_build_targets_ai_edit_subpath() -> None:
    package_json = (ROOT / "frontend/package.json").read_text()
    vite_config = (ROOT / "frontend/vite.config.js").read_text()
    app_main = (ROOT / "backend/app/main.py").read_text()

    assert '"build": "vite build"' in package_json
    assert "base: mode === 'production' ? '/ai-edit-factory/' : '/'" in vite_config
    assert 'app.mount("/ai-edit-factory", StaticFiles' in app_main
    assert 'app.mount("/outputs", StaticFiles' in app_main
    assert 'app.mount("/inputs", StaticFiles' in app_main


def test_frontend_production_build_rewrites_assets_to_ai_edit_subpath() -> None:
    if not shutil.which("npm"):
        pytest.skip("npm is required to verify the production Vite asset base")

    subprocess.run(["npm", "run", "build"], cwd=ROOT / "frontend", check=True)
    built_html = (ROOT / "frontend/dist/index.html").read_text()

    assert "/ai-edit-factory/assets/" in built_html
    assert 'src="/assets/' not in built_html
    assert 'href="/assets/' not in built_html
