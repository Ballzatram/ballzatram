from app.services.reporting import render_markdown


def test_markdown_renderer_does_not_invent_canned_analysis():
    markdown = render_markdown(
        "Portfolio Stress Review",
        [
            "Portfolio annualized volatility: 18.2%.",
            "Source: demo-provider / QQQ / status=demo / as-of=2026-08-18.",
            "Warning: historical relationships are descriptive.",
        ],
        {"Rates shock": -0.081},
    )

    assert "# Portfolio Stress Review" in markdown
    assert "Portfolio annualized volatility: 18.2%." in markdown
    assert "Source: demo-provider" in markdown
    assert "Rates shock: -8.10%" in markdown
    assert "Multi-model workflow" not in markdown
    assert "Real rates, inflation, and credit spread proxies" not in markdown


def test_markdown_renderer_handles_empty_findings_explicitly():
    markdown = render_markdown("Empty", [], {})
    assert "No findings were supplied" in markdown
    assert "Scenario Outcomes" not in markdown
