from __future__ import annotations

from datetime import date


def render_markdown(title: str, findings: list[str], scenario_outcomes: dict[str, float]) -> str:
    """Render only user/tool-supplied report content.

    The previous renderer inserted canned methodology, drivers, and risk text even
    when the underlying analysis had not produced those findings. Reports are now
    deliberately conservative: if a section was not supplied by a real tool run,
    it is not invented here.
    """
    lines = [f"# {title}", f"Generated: {date.today().isoformat()}", ""]

    if findings:
        lines.extend(["## Findings", *(f"- {item}" for item in findings), ""])
    else:
        lines.extend(["## Findings", "- No findings were supplied.", ""])

    if scenario_outcomes:
        lines.append("## Scenario Outcomes")
        lines.extend(f"- {name}: {value:.2%}" for name, value in scenario_outcomes.items())
        lines.append("")

    lines.extend([
        "## Report Boundary",
        "- This artifact contains only supplied analysis outputs and their attached context; it does not add unstated research conclusions.",
    ])
    return "\n".join(lines)
