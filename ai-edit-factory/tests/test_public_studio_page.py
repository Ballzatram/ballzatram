from pathlib import Path


PUBLIC_STUDIO = Path(__file__).resolve().parents[1] / "index.html"


def test_public_studio_has_backend_offline_preview_mode() -> None:
    html = PUBLIC_STUDIO.read_text()

    assert "function createLocalProject" in html
    assert "Backend offline: preview mode only" in html
    assert "if (!state.apiOnline)" in html
    assert "addLocalVideos" in html
    assert "buildLocalPlan" in html
    assert "Download source preview" not in html
    assert "platform: 'browser-preview'" not in html


def test_public_studio_preserves_api_base_when_health_candidates_fail() -> None:
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
