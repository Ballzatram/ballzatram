from pathlib import Path

import pandas as pd

from app.analytics.models import (
    annualized_volatility,
    max_drawdown,
    rolling_beta,
    run_ols,
    stress_test,
    var_expected_shortfall,
)
from app.data.timeseries import load_demo_series
from app.services.workspace_store import WorkspaceStore


def test_ols_outputs_have_core_fields():
    df = load_demo_series().dropna().tail(80)
    out = run_ols(df, "asset_ret", ["cpi_yoy", "ffr", "dxy"])
    assert "coefficients" in out and "r_squared" in out and "adjusted_r_squared" in out


def test_drawdown_and_volatility():
    df = load_demo_series().dropna().tail(60)
    r = df["asset_ret"]
    assert annualized_volatility(r) >= 0
    assert max_drawdown(r) <= 0


def test_var_es_and_rolling_beta():
    df = load_demo_series().dropna().tail(80)
    stats = var_expected_shortfall(df["asset_ret"])
    assert "var" in stats and "expected_shortfall" in stats
    rb = rolling_beta(df["asset_ret"], df["dxy"], window=12)
    assert len(rb) > 0


def test_stress_deterministic_and_contributions():
    out = stress_test({"rates": 1.0}, {"AAPL": 0.5, "MSFT": 0.5})
    assert "factor_contributions" in out


def test_workspace_version_creation(tmp_path: Path):
    store = WorkspaceStore(tmp_path / "ws.json")
    created = store.create_workspace("t", "p", {"tickers": ["SPY"]}, {"cards": []})
    rerun = store.rerun_workspace(created["workspace_id"], {"tickers": ["QQQ"]}, {"cards": []})
    assert len(rerun["versions"]) == 2
