from datetime import date

def render_markdown(title: str, findings: list[str]) -> str:
    lines = [f"# {title}", f"Generated: {date.today().isoformat()}", "", "## Executive Summary"]
    lines.extend([f"- {f}" for f in findings])
    lines.extend([
        "",
        "## Methodology Notes",
        "- Models indicate association, not causal proof.",
        "- Confidence intervals are model-dependent.",
        "- Stress scenarios are hypothetical and not forecasts.",
    ])
    return "\n".join(lines)
