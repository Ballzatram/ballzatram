from __future__ import annotations

TEMPLATES = ("fast_cut", "high_motion", "slow_mo", "lyric_caption", "random_montage", "retro_tv_filter")


def normalize_template(template: str) -> str:
    if template == "CRTV/retro_tv_filter":
        template = "retro_tv_filter"
    if template not in TEMPLATES:
        raise ValueError(f"Unknown template '{template}'. Choose one of: {', '.join(TEMPLATES)}")
    return template
