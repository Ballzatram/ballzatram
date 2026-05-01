from app.data.timeseries import align_and_normalize, load_demo_series
from app.analytics.models import run_ols, compare_regularized, stress_test


def test_ols_outputs_have_core_fields():
    df = load_demo_series()
    out = run_ols(df, "asset_ret", ["cpi_yoy", "ffr", "dxy"])
    assert "coefficients" in out and "p_values" in out and "r_squared" in out


def test_regularized_models_present():
    df = load_demo_series()
    out = compare_regularized(df, "asset_ret", ["cpi_yoy", "ffr", "dxy"])
    assert set(out.keys()) == {"ridge", "lasso", "elastic_net"}


def test_stress_deterministic():
    a = stress_test({"rates": 1.0}, {"AAPL": 0.6, "MSFT": 0.4})
    b = stress_test({"rates": 1.0}, {"AAPL": 0.6, "MSFT": 0.4})
    assert a == b


def test_alignment_missing_policy():
    df = load_demo_series()[["asset_ret", "cpi_yoy"]]
    out = align_and_normalize([df], missing_policy="ffill")
    assert len(out) > 0
