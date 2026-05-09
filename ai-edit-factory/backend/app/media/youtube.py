from __future__ import annotations

import json
import re
import subprocess
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from app.config import ALLOW_YOUTUBE_DOWNLOADS

YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


@dataclass(frozen=True)
class YouTubeMetadata:
    video_id: str
    url: str
    title: str = ""
    channel: str = ""
    duration: float | None = None
    thumbnail: str = ""


def parse_youtube_video_id(url: str) -> str:
    parsed = urllib.parse.urlparse(url.strip())
    host = parsed.netloc.lower().removeprefix("www.").removeprefix("m.")
    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
    elif host in {"youtube.com", "music.youtube.com"}:
        if parsed.path == "/watch":
            video_id = urllib.parse.parse_qs(parsed.query).get("v", [""])[0]
        elif parsed.path.startswith("/shorts/") or parsed.path.startswith("/embed/"):
            video_id = parsed.path.strip("/").split("/")[1]
        else:
            video_id = ""
    else:
        video_id = ""
    if not YOUTUBE_ID_RE.fullmatch(video_id):
        raise ValueError("Enter a valid public YouTube video URL.")
    return video_id


def canonical_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def fetch_youtube_metadata(url: str, timeout: float = 6.0) -> YouTubeMetadata:
    """Fetch public metadata only; this does not download media."""
    video_id = parse_youtube_video_id(url)
    safe_url = canonical_url(video_id)
    oembed = "https://www.youtube.com/oembed?" + urllib.parse.urlencode({"url": safe_url, "format": "json"})
    try:
        with urllib.request.urlopen(oembed, timeout=timeout) as response:  # noqa: S310 - fixed YouTube oEmbed URL.
            data = json.loads(response.read().decode("utf-8"))
    except Exception:
        data = {}
    return YouTubeMetadata(
        video_id=video_id,
        url=safe_url,
        title=data.get("title", ""),
        channel=data.get("author_name", ""),
        thumbnail=data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"),
    )


def download_youtube_media(url: str, output_dir: str | Path, i_have_rights_to_download: bool = False) -> Path:
    """Rights-gated media download; disabled unless both env and explicit flag allow it."""
    if not i_have_rights_to_download:
        raise PermissionError("YouTube media download requires --i-have-rights-to-download.")
    if not ALLOW_YOUTUBE_DOWNLOADS:
        raise PermissionError("YouTube media download is disabled in this deployment.")
    video_id = parse_youtube_video_id(url)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_template = output_dir / f"youtube_{video_id}.%(ext)s"
    subprocess.run(
        [
            "yt-dlp",
            "--no-playlist",
            "--no-call-home",
            "--restrict-filenames",
            "-f",
            "bv*+ba/b",
            "-o",
            str(output_template),
            canonical_url(video_id),
        ],
        check=True,
    )
    matches = sorted(output_dir.glob(f"youtube_{video_id}.*"))
    if not matches:
        raise RuntimeError("yt-dlp completed but no output file was found.")
    return matches[0]
