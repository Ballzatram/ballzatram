from pathlib import Path


PUBLIC_STUDIO = Path(__file__).resolve().parents[1] / "index.html"


def test_public_studio_has_creator_preview_mode_without_backend_settings() -> None:
    html = PUBLIC_STUDIO.read_text()

    assert "function createLocalProject" in html
    assert "Preview mode only" in html
    assert "Backend settings" not in html
    assert "API origin" not in html
    assert "apiSettingsButton" not in html
    assert "aiefApiBase" not in html
    assert "if (!state.apiOnline)" in html
    assert "addLocalVideos" in html
    assert "buildLocalPlan" in html
    assert "Download source preview" not in html
    assert "platform: 'browser-preview'" not in html


def test_public_studio_preserves_auto_detect_base_when_health_candidates_fail() -> None:
    html = PUBLIC_STUDIO.read_text()

    assert "const originalApiBase = state.apiBase" in html
    assert "state.apiBase = originalApiBase" in html
    assert "port !== '8000' && (protocol === 'http:' || isLocalHost)" in html


def test_public_studio_uses_blob_safe_media_urls() -> None:
    html = PUBLIC_STUDIO.read_text()

    assert "function mediaUrl" in html
    assert "/^(blob:|data:|https?:)/" in html
    assert "src=\"${mediaUrl(source.preview_url)}\"" in html
    assert "href=\"${mediaUrl(item.download_url)}\"" in html
