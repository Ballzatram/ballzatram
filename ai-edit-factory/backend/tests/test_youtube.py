import pytest

from app.media.youtube import parse_youtube_video_id


def test_parse_standard_youtube_url() -> None:
    assert parse_youtube_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"


def test_parse_short_url() -> None:
    assert parse_youtube_video_id("https://youtu.be/dQw4w9WgXcQ?si=abc") == "dQw4w9WgXcQ"


def test_parse_shorts_url() -> None:
    assert parse_youtube_video_id("https://youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"


def test_reject_non_youtube_url() -> None:
    with pytest.raises(ValueError):
        parse_youtube_video_id("https://example.com/watch?v=dQw4w9WgXcQ")
