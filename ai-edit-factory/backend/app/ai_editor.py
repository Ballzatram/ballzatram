from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

SYSTEM_INSTRUCTION = (
    "You are Ballzatram's AI clip-making studio: a creative short-form video editor. "
    "Only assist with user-provided, owned, licensed, or otherwise rights-cleared media. "
    "Do not suggest scraping, downloading, ripping, bypassing DRM, or sourcing clips from TV, movies, games, YouTube, TikTok, or other platforms. "
    "Return actionable structured edit plans optimized for hook strength, pacing, caption clarity, replayability, and hashtag relevance."
)

PLATFORMS = ("tiktok", "instagram_reels", "youtube_shorts", "x")


@dataclass(frozen=True)
class VideoMetadata:
    duration: float | None = None
    width: int | None = None
    height: int | None = None
    file_type: str | None = None


def _word_match(prompt: str, words: tuple[str, ...]) -> bool:
    return any(word in prompt for word in words)


def infer_platform(prompt: str) -> str:
    prompt = prompt.lower()
    if "youtube" in prompt or "shorts" in prompt:
        return "youtube_shorts"
    if "instagram" in prompt or "reels" in prompt or "reel" in prompt:
        return "instagram_reels"
    if re.search(r"\bx\b|twitter", prompt):
        return "x"
    return "tiktok"


def infer_duration(prompt: str, media_duration: float | None) -> int:
    match = re.search(r"(\d{1,3})\s*(?:second|sec|s)\b", prompt.lower())
    requested = int(match.group(1)) if match else 20
    maximum = int(media_duration) if media_duration and media_duration > 0 else 60
    return max(6, min(requested, maximum, 60))


def infer_mood(prompt: str) -> str:
    prompt_lower = prompt.lower()
    moods: list[str] = []
    for label, words in {
        "chaotic": ("chaotic", "wild", "unhinged", "fast"),
        "funny": ("funny", "comedy", "joke", "meme", "dark funny"),
        "dramatic": ("dramatic", "cinematic", "intense", "epic"),
        "clean": ("clean", "minimal", "polished"),
        "hype": ("hype", "viral", "energetic", "sports"),
        "dark": ("dark", "moody", "gritty"),
    }.items():
        if _word_match(prompt_lower, words):
            moods.append(label)
    return " ".join(dict.fromkeys(moods)) or "high-retention punchy"


def _segments(duration: int, source_duration: float | None, mood: str, pacing: str = "balanced") -> list[dict[str, Any]]:
    source = max(float(source_duration or duration), float(duration))
    segment_count = 6 if pacing == "faster" else (5 if "chaotic" in mood or duration >= 20 else 4)
    slice_len = max(1.4 if pacing == "faster" else 2.0, duration / segment_count)
    usable_window = max(slice_len + 0.5, source - slice_len)
    starts = [min(usable_window, round((index * usable_window) / max(1, segment_count), 1)) for index in range(segment_count)]
    reasons = [
        "opens with the clearest hook moment",
        "adds fast context without slowing pacing",
        "sets up the payoff",
        "keeps visual novelty high for retention",
        "lands the replayable punchline",
    ]
    return [
        {
            "source_start": start,
            "source_end": min(round(start + slice_len + (0.6 if index == 0 else 0), 1), round(source, 1)),
            "reason": reasons[index % len(reasons)],
        }
        for index, start in enumerate(starts)
    ]


def _overlays(mood: str, duration: int, prompt: str, density: str = "standard") -> list[dict[str, Any]]:
    hook = "wait for it..."
    if "chaotic" in mood and "funny" in mood:
        hook = "bro thought he had it"
    elif "dramatic" in mood:
        hook = "this escalated fast"
    elif "hype" in mood:
        hook = "the moment everything changed"
    overlays = [
        {"time": 0.3, "text": hook, "style": "bold_center"},
        {"time": max(2.2, round(duration * 0.28, 1)), "text": "no way this worked", "style": "punchline_pop"},
        {"time": max(4.0, round(duration * 0.72, 1)), "text": "watch the ending", "style": "bottom_sticker"},
    ]
    if density == "high":
        overlays.insert(2, {"time": max(3.2, round(duration * 0.48, 1)), "text": "the setup matters", "style": "bottom_sticker"})
    return overlays


def _music_vibe(mood: str) -> str:
    if "dark" in mood and "funny" in mood:
        return "dark comedic trap, fast tempo, heavy bass, playful suspense hits"
    if "dramatic" in mood:
        return "cinematic risers, punchy impacts, tense low drums"
    if "clean" in mood:
        return "minimal upbeat electronic, light percussion, polished transitions"
    return "high-energy short-form beat, tight drops, clear edit points"


def _caption_packages(mood: str, platform: str, prompt: str) -> dict[str, dict[str, list[str]]]:
    base_tags = ["#ballzatram", "#aiedit", "#shortform", "#viralclip"]
    if "funny" in mood:
        base_tags.extend(["#funny", "#memes"])
    if "dramatic" in mood:
        base_tags.extend(["#storytime", "#plotTwist"])
    packages: dict[str, dict[str, list[str]]] = {}
    for name in PLATFORMS:
        label = {
            "tiktok": "TikTok",
            "instagram_reels": "Reels",
            "youtube_shorts": "Shorts",
            "x": "X",
        }[name]
        packages[name] = {
            "titles": [
                "This got out of hand fast",
                "The ending makes it 10x better",
                f"{label} cut: wait for the payoff",
            ],
            "captions": [
                "I was not ready for that ending.",
                "The confidence before disaster is unmatched.",
                "Watch it twice — the setup is hiding in plain sight.",
            ],
            "hashtags": (base_tags + (["#tiktokmademewatch"] if name == "tiktok" else ["#reels"] if name == "instagram_reels" else ["#shorts"] if name == "youtube_shorts" else ["#video"])),
        }
    return packages


def generate_edit_plan(prompt: str, metadata: VideoMetadata, learning_profile: dict[str, Any] | None = None, music_duration: float | None = None) -> dict[str, Any]:
    clean_prompt = (prompt or "").strip()
    if len(clean_prompt) < 3:
        clean_prompt = "Make this a punchy 20-second short-form clip with a clear hook and captions."
    platform = infer_platform(clean_prompt)
    duration = infer_duration(clean_prompt, metadata.duration)
    mood = infer_mood(clean_prompt)
    aspect_ratio = "9:16" if platform != "x" else "4:5"
    profile = learning_profile or {}
    pacing = str(profile.get("recommended_pacing") or "balanced")
    caption_density = str(profile.get("caption_density") or "standard")
    music_start = 0.0
    if music_duration and music_duration > duration:
        music_start = round(max(0.0, (music_duration - duration) * 0.33), 1)
    plan = {
        "platform": platform,
        "duration_seconds": duration,
        "aspect_ratio": aspect_ratio,
        "mood": mood,
        "segments": _segments(duration, metadata.duration, mood, pacing),
        "text_overlays": _overlays(mood, duration, clean_prompt, caption_density),
        "caption_style": "large punchy subtitles with emphasized keywords and safe margins",
        "music_vibe": _music_vibe(mood),
        "music_start_seconds": music_start,
        "music_edit_note": "The renderer starts the uploaded song at this second; adjust it before rendering to choose the best hook/drop.",
        "export_notes": "fast cuts, crop for vertical short-form, keep faces/action centered, add beat hits on overlay changes",
        "caption_packages": _caption_packages(mood, platform, clean_prompt),
        "learning_profile": profile or {"sample_size": 0, "recommended_pacing": "balanced", "caption_density": "standard"},
        "trend_context": "Uses rights-safe short-form heuristics and first-party feedback only; TikTok trend data should be imported through official/permissioned sources, not scraping.",
        "system_instruction": SYSTEM_INSTRUCTION,
    }
    # Validate JSON-serializable output early.
    json.dumps(plan)
    return plan
