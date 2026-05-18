from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import ElasticNet, Lasso, Ridge


def _fit_linear_model(df: pd.DataFrame, y_col: str, x_cols: list[str]) -> dict:
    names = ["const", *x_cols]
    x_values = df[x_cols].astype(float).to_numpy()
    X = np.column_stack([np.ones(len(df)), x_values])
    y = df[y_col].astype(float).to_numpy()

    coefficients, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    fitted = X @ coefficients
    residuals = y - fitted
    dof = max(len(y) - X.shape[1], 1)
    rss = float(np.sum(residuals ** 2))
    tss = float(np.sum((y - np.mean(y)) ** 2))
    r_squared = 1.0 - rss / tss if tss > 0 else 0.0

    xtx_inv = np.linalg.pinv(X.T @ X)
    sigma2 = rss / dof
    standard_errors = np.sqrt(np.maximum(np.diag(xtx_inv) * sigma2, 0))
    with np.errstate(divide="ignore", invalid="ignore"):
        t_stats = np.divide(coefficients, standard_errors, out=np.zeros_like(coefficients), where=standard_errors > 0)
    p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof))
    critical = stats.t.ppf(0.975, dof)
    ci_low = coefficients - critical * standard_errors
    ci_high = coefficients + critical * standard_errors

    return {
        "coefficients": dict(zip(names, coefficients)),
        "p_values": dict(zip(names, p_values)),
        "r_squared": float(r_squared),
        "confidence_intervals": {name: [float(low), float(high)] for name, low, high in zip(names, ci_low, ci_high)},
    }


def run_ols(df: pd.DataFrame, y_col: str, x_cols: list[str]) -> dict:
    fit = _fit_linear_model(df, y_col, x_cols)
    return {
        "coefficients": {k: float(v) for k, v in fit["coefficients"].items()},
        "p_values": {k: float(v) for k, v in fit["p_values"].items()},
        "r_squared": float(fit["r_squared"]),
        "confidence_intervals": fit["confidence_intervals"],
    }


def rolling_regression(df: pd.DataFrame, y_col: str, x_col: str, window: int = 24) -> list[dict]:
    rows = []
    for i in range(window, len(df) + 1):
        sample = df.iloc[i - window : i]
        fit = _fit_linear_model(sample, y_col, [x_col])
        rows.append({"date": str(sample.index[-1].date()), "beta": float(fit["coefficients"][x_col]), "r2": float(fit["r_squared"])})
    return rows


def compare_regularized(df: pd.DataFrame, y_col: str, x_cols: list[str]) -> dict:
    X, y = df[x_cols], df[y_col]
    models = {
        "ridge": Ridge(alpha=1.0),
        "lasso": Lasso(alpha=0.001, random_state=42),
        "elastic_net": ElasticNet(alpha=0.001, l1_ratio=0.5, random_state=42),
    }
    out = {}
    for n, m in models.items():
        m.fit(X, y)
        out[n] = {"r2": float(m.score(X, y)), "coefficients": [float(v) for v in m.coef_]}
    return out


def event_study(df: pd.DataFrame, asset_col: str, market_col: str, release_dates: list[pd.Timestamp], window: int) -> dict:
    # market model abnormal return approximation
    beta = np.cov(df[asset_col], df[market_col])[0, 1] / np.var(df[market_col])
    alpha = df[asset_col].mean() - beta * df[market_col].mean()
    ar_samples = []
    for event_date in release_dates:
        event_slice = df.loc[event_date - pd.Timedelta(days=window*31): event_date + pd.Timedelta(days=window*31)]
        ar = event_slice[asset_col] - (alpha + beta * event_slice[market_col])
        ar_samples.append(ar.values[: 2 * window + 1])
    arr = np.array([a for a in ar_samples if len(a) == 2 * window + 1])
    aar = arr.mean(axis=0)
    car = aar.cumsum()
    return {"aar": [float(x) for x in aar], "car": [float(x) for x in car], "event_count": int(len(arr))}


def stress_test(shocks: dict[str, float], holdings: dict[str, float]) -> dict:
    factor_map = {"rates": -0.24, "cpi": -0.11, "growth": 0.19, "oil": -0.07, "credit": -0.21}
    factor_shock = sum(factor_map.get(k, 0.0) * v for k, v in shocks.items())
    normalized = {k: v / sum(holdings.values()) for k, v in holdings.items()}
    pnl = sum(w * factor_shock for w in normalized.values())
    return {"portfolio_return_shock": round(float(pnl), 4), "confidence_band": [round(float(pnl - 0.03), 4), round(float(pnl + 0.03), 4)]}


def feature_importance(df: pd.DataFrame, y_col: str, x_cols: list[str]) -> dict:
    X, y = df[x_cols], df[y_col]
    rf = RandomForestRegressor(n_estimators=80, random_state=42).fit(X, y)
    gbm = GradientBoostingRegressor(random_state=42).fit(X, y)
    return {
        "rf": {k: float(v) for k, v in zip(x_cols, rf.feature_importances_)},
        "gbm": {k: float(v) for k, v in zip(x_cols, gbm.feature_importances_)},
    }


def detect_regimes(df: pd.DataFrame, cols: list[str], k: int = 3) -> dict:
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(df[cols])
    centers = [{cols[i]: float(v) for i, v in enumerate(c)} for c in km.cluster_centers_]
    return {"cluster_centers": centers, "labels": [int(x) for x in km.labels_[-12:]]}
