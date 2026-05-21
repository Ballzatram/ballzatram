from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats


def simple_returns(prices: pd.Series) -> pd.Series:
    return prices.pct_change().dropna()


def log_returns(prices: pd.Series) -> pd.Series:
    return np.log(prices / prices.shift(1)).dropna()


def cumulative_returns(returns: pd.Series) -> pd.Series:
    return (1 + returns).cumprod() - 1


def annualized_return(returns: pd.Series, periods: int = 12) -> float:
    return float((1 + returns.mean()) ** periods - 1)


def annualized_volatility(returns: pd.Series, periods: int = 12) -> float:
    return float(returns.std(ddof=1) * np.sqrt(periods))


def downside_deviation(returns: pd.Series, mar: float = 0.0, periods: int = 12) -> float:
    downside = np.minimum(returns - mar, 0.0)
    return float(np.sqrt((downside ** 2).mean()) * np.sqrt(periods))


def sharpe_ratio(returns: pd.Series, rf: float = 0.0, periods: int = 12) -> float:
    vol = annualized_volatility(returns, periods)
    if vol == 0:
        return 0.0
    return float((annualized_return(returns, periods) - rf) / vol)


def sortino_ratio(returns: pd.Series, rf: float = 0.0, periods: int = 12) -> float:
    dd = downside_deviation(returns, rf / periods, periods)
    if dd == 0:
        return 0.0
    return float((annualized_return(returns, periods) - rf) / dd)


def max_drawdown(returns: pd.Series) -> float:
    cum = (1 + returns).cumprod()
    dd = cum / cum.cummax() - 1
    return float(dd.min())


def calmar_ratio(returns: pd.Series, periods: int = 12) -> float:
    mdd = abs(max_drawdown(returns))
    if mdd == 0:
        return 0.0
    return float(annualized_return(returns, periods) / mdd)


def beta_alpha(asset: pd.Series, benchmark: pd.Series, periods: int = 12) -> dict:
    x = benchmark.values
    y = asset.values
    beta = float(np.cov(y, x)[0, 1] / np.var(x)) if np.var(x) != 0 else 0.0
    alpha = float((y.mean() - beta * x.mean()) * periods)
    return {"beta": beta, "alpha": alpha}


def tracking_error(asset: pd.Series, benchmark: pd.Series, periods: int = 12) -> float:
    return float((asset - benchmark).std(ddof=1) * np.sqrt(periods))


def information_ratio(asset: pd.Series, benchmark: pd.Series, periods: int = 12) -> float:
    te = tracking_error(asset, benchmark, periods)
    if te == 0:
        return 0.0
    active = (asset - benchmark).mean() * periods
    return float(active / te)


def rolling_beta(asset: pd.Series, benchmark: pd.Series, window: int = 24) -> list[dict]:
    rows = []
    for i in range(window, len(asset) + 1):
        a = asset.iloc[i - window:i]
        b = benchmark.iloc[i - window:i]
        rows.append({"date": str(a.index[-1].date()), "value": beta_alpha(a, b)["beta"]})
    return rows


def ols_regression(df: pd.DataFrame, y_col: str, x_cols: list[str]) -> dict:
    y = df[y_col].astype(float).values
    X = np.column_stack([np.ones(len(df)), df[x_cols].astype(float).values])
    names = ["intercept", *x_cols]
    coef, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    fitted = X @ coef
    residuals = y - fitted
    n = len(y)
    k = X.shape[1] - 1
    rss = np.sum(residuals ** 2)
    tss = np.sum((y - y.mean()) ** 2)
    r2 = 1 - rss / tss if tss else 0.0
    adj = 1 - (1 - r2) * (n - 1) / max(n - k - 1, 1)
    dof = max(n - k - 1, 1)
    sigma2 = rss / dof
    cov = sigma2 * np.linalg.pinv(X.T @ X)
    se = np.sqrt(np.maximum(np.diag(cov), 0))
    t_stat = np.divide(coef, se, out=np.zeros_like(coef), where=se > 0)
    p_val = 2 * (1 - stats.t.cdf(np.abs(t_stat), dof))
    return {
        "coefficients": {n: float(v) for n, v in zip(names, coef)},
        "intercept": float(coef[0]),
        "r_squared": float(r2),
        "adjusted_r_squared": float(adj),
        "t_stat": {n: float(v) for n, v in zip(names, t_stat)},
        "p_value": {n: float(v) for n, v in zip(names, p_val)},
        "sample_size": n,
        "methodology_note": "Ordinary Least Squares with closed-form normal equations",
    }


def correlation_matrix(df: pd.DataFrame, cols: list[str]) -> dict:
    return {"columns": cols, "matrix": df[cols].corr().fillna(0).round(6).values.tolist()}


def var_expected_shortfall(returns: pd.Series, confidence: float = 0.95) -> dict:
    q = float(np.quantile(returns, 1 - confidence))
    tail = returns[returns <= q]
    return {"var": q, "expected_shortfall": float(tail.mean()) if len(tail) else q}


def run_ols(df: pd.DataFrame, y_col: str, x_cols: list[str]) -> dict:
    return ols_regression(df, y_col, x_cols)


def rolling_regression(df: pd.DataFrame, y_col: str, x_col: str, window: int = 24) -> list[dict]:
    rows = []
    for i in range(window, len(df) + 1):
        sample = df.iloc[i - window:i]
        ols = ols_regression(sample, y_col, [x_col])
        rows.append({"date": str(sample.index[-1].date()), "beta": ols["coefficients"][x_col], "r2": ols["r_squared"]})
    return rows


def stress_test(shocks: dict[str, float], holdings: dict[str, float]) -> dict:
    factor_map = {"rates": -0.24, "cpi": -0.11, "growth": 0.19, "oil": -0.07, "credit": -0.21}
    weight_sum = sum(holdings.values()) or 1.0
    contributions = []
    total = 0.0
    for factor, shock in shocks.items():
        impact = factor_map.get(factor, 0.0) * shock
        contributions.append({"factor": factor, "shock": shock, "impact": round(float(impact), 4)})
        total += impact
    pnl = sum((w / weight_sum) * total for w in holdings.values())
    return {"portfolio_return_shock": round(float(pnl), 4), "confidence_band": [round(float(pnl - 0.03), 4), round(float(pnl + 0.03), 4)], "factor_contributions": contributions}
