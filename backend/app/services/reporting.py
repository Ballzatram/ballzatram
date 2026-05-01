from __future__ import annotations

from datetime import date


def render_markdown(title: str, findings: list[str], scenario_outcomes: dict[str, float]) -> str:
    lines = [
        f"# {title}",
        f"Generated: {date.today().isoformat()}",
        "",
        "## Executive Summary",
        *(f"- {x}" for x in findings[:5]),
        "",
        "## Methodology",
        "- Multi-model workflow: OLS, regularized linear models, tree importance, and regime clustering.",
        "- Event analysis uses abnormal returns and cumulative abnormal returns (CAR).",
        "",
        "## Key Drivers",
        "- Real rates, inflation, and credit spread proxies are primary explanatory factors in demo runs.",
        "",
        "## Risk Exposures",
        "- Portfolio drawdown sensitivity is highest to rates and credit shocks under baseline coefficients.",
        "",
        "## Scenario Outcomes",
    ]
    lines.extend([f"- {k}: {v:.2%}" for k, v in scenario_outcomes.items()] or ["- No scenarios submitted."])
    lines.extend([
        "",
        "## Caveats",
        "- Correlation does not establish causation.",
        "- Backtests may not generalize across structural breaks.",
    ])
    return "\n".join(lines)
