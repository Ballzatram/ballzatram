from app.services.analytics import model_compare, scenario_impact


def test_model_compare_contains_core_models():
    out = model_compare()
    assert "ols" in out and "ridge" in out and "random_forest" in out


def test_scenario_impact_bounds():
    res = scenario_impact({"rates": 1.0, "cpi": 1.0}, {"AAPL": 0.6, "XLF": 0.4})
    assert "portfolio_return_shock" in res
    assert len(res["confidence_band"]) == 2
