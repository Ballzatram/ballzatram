from __future__ import annotations

import numpy as np
import pandas as pd


def clean_series(series: pd.Series) -> pd.Series:
    return series.astype(float).replace([np.inf, -np.inf], np.nan).dropna().sort_index()


def daily_returns(prices: pd.Series) -> pd.Series:
    return clean_series(prices).pct_change().replace([np.inf, -np.inf], np.nan).dropna()


def cumulative_returns(returns: pd.Series) -> pd.Series:
    return (1 + clean_series(returns)).cumprod() - 1


def rolling_volatility(returns: pd.Series, window: int = 20, periods: int = 252) -> pd.Series:
    return clean_series(returns).rolling(window=window, min_periods=max(2, min(window, 5))).std(ddof=1) * np.sqrt(periods)


def max_drawdown(returns: pd.Series) -> float:
    cleaned = clean_series(returns)
    if cleaned.empty:
        return 0.0
    equity = (1 + cleaned).cumprod()
    drawdowns = equity / equity.cummax() - 1
    return float(drawdowns.min())


def moving_average(prices: pd.Series, window: int) -> pd.Series:
    return clean_series(prices).rolling(window=window, min_periods=1).mean()


def relative_strength_index(prices: pd.Series, window: int = 14) -> pd.Series:
    cleaned = clean_series(prices)
    delta = cleaned.diff()
    gains = delta.clip(lower=0)
    losses = -delta.clip(upper=0)
    average_gain = gains.rolling(window=window, min_periods=window).mean()
    average_loss = losses.rolling(window=window, min_periods=window).mean()
    rs = average_gain / average_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    rsi = rsi.where(average_loss != 0, 100)
    rsi = rsi.where(average_gain != 0, 0)
    rsi = rsi.where(~((average_gain == 0) & (average_loss == 0)), 50)
    return rsi.dropna()


def z_score(series: pd.Series, window: int | None = None) -> pd.Series:
    cleaned = clean_series(series)
    if cleaned.empty:
        return cleaned
    if window:
        mean = cleaned.rolling(window=window, min_periods=max(2, min(window, 5))).mean()
        std = cleaned.rolling(window=window, min_periods=max(2, min(window, 5))).std(ddof=0)
    else:
        mean = pd.Series(cleaned.mean(), index=cleaned.index)
        std = pd.Series(cleaned.std(ddof=0), index=cleaned.index)
    return ((cleaned - mean) / std.replace(0, np.nan)).dropna()


def align_returns(asset_returns: pd.Series, benchmark_returns: pd.Series) -> pd.DataFrame:
    return pd.concat({"asset": clean_series(asset_returns), "benchmark": clean_series(benchmark_returns)}, axis=1).dropna()


def beta_vs_benchmark(asset_returns: pd.Series, benchmark_returns: pd.Series) -> float:
    aligned = align_returns(asset_returns, benchmark_returns)
    if len(aligned) < 2:
        return 0.0
    benchmark = aligned["benchmark"].to_numpy()
    asset = aligned["asset"].to_numpy()
    variance = float(np.mean((benchmark - benchmark.mean()) ** 2))
    if variance == 0:
        return 0.0
    covariance = float(np.mean((asset - asset.mean()) * (benchmark - benchmark.mean())))
    return covariance / variance


def correlation_matrix(returns_by_symbol: dict[str, pd.Series]) -> dict:
    frame = pd.DataFrame({symbol: clean_series(series) for symbol, series in returns_by_symbol.items()}).dropna(how="all")
    matrix = frame.corr().fillna(0).round(6)
    return {"columns": list(matrix.columns), "matrix": matrix.values.tolist()}


def relative_strength(asset_prices: pd.Series, benchmark_prices: pd.Series) -> pd.Series:
    aligned = pd.concat({"asset": clean_series(asset_prices), "benchmark": clean_series(benchmark_prices)}, axis=1).dropna()
    if aligned.empty:
        return pd.Series(dtype=float)
    normalized_asset = aligned["asset"] / aligned["asset"].iloc[0]
    normalized_benchmark = aligned["benchmark"] / aligned["benchmark"].iloc[0]
    return normalized_asset / normalized_benchmark - 1


def yield_curve_spreads(rate_series: dict[str, pd.Series]) -> dict:
    spreads: dict[str, dict] = {}
    pairs = {
        "2y10y": ("DGS10", "DGS2"),
        "3m10y": ("DGS10", "TB3MS"),
    }
    for spread_id, (long_id, short_id) in pairs.items():
        if long_id not in rate_series or short_id not in rate_series:
            spreads[spread_id] = {"status": "missing", "latest": None, "history": []}
            continue
        aligned = pd.concat({"long": clean_series(rate_series[long_id]), "short": clean_series(rate_series[short_id])}, axis=1).dropna()
        values = aligned["long"] - aligned["short"]
        history = [{"date": str(index.date()), "value": float(value)} for index, value in values.tail(36).items()]
        spreads[spread_id] = {"status": "available", "latest": float(values.iloc[-1]) if len(values) else None, "history": history}
    return spreads


def simple_regime_score(
    *,
    rolling_volatility_value: float | None,
    max_drawdown_value: float | None,
    relative_strength_value: float | None,
    curve_spreads: dict,
) -> dict:
    score = 50.0
    reasons: list[str] = []

    if rolling_volatility_value is not None:
        if rolling_volatility_value > 0.3:
            score -= 15
            reasons.append("Rolling volatility is elevated in the selected sample.")
        elif rolling_volatility_value < 0.15:
            score += 7
            reasons.append("Rolling volatility is subdued in the selected sample.")

    if max_drawdown_value is not None:
        if max_drawdown_value < -0.2:
            score -= 15
            reasons.append("The selected window contains a deep drawdown.")
        elif max_drawdown_value > -0.05:
            score += 5
            reasons.append("The selected window has shallow drawdown so far.")

    if relative_strength_value is not None:
        if relative_strength_value > 0.03:
            score += 7
            reasons.append("The sample asset has outperformed the benchmark over the window.")
        elif relative_strength_value < -0.03:
            score -= 7
            reasons.append("The sample asset has lagged the benchmark over the window.")

    two_ten = curve_spreads.get("2y10y", {}).get("latest")
    three_month_ten = curve_spreads.get("3m10y", {}).get("latest")
    if two_ten is not None and two_ten < 0:
        score -= 8
        reasons.append("The 2Y/10Y curve spread is inverted in the rates sample.")
    if three_month_ten is not None and three_month_ten < 0:
        score -= 8
        reasons.append("The 3M/10Y curve spread is inverted in the rates sample.")

    bounded = max(0.0, min(100.0, score))
    if bounded >= 65:
        label = "risk-on sample"
    elif bounded <= 35:
        label = "risk-off sample"
    else:
        label = "mixed sample"

    return {
        "score": round(bounded, 2),
        "label": label,
        "reasons": reasons or ["Inputs are mixed or not far enough from neutral thresholds."],
        "caveats": [
            "This is a descriptive heuristic, not a forecast.",
            "Changing the window, provider, or benchmark can change the label.",
        ],
    }

