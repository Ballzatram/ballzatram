import numpy as np
import pandas as pd
from sklearn.linear_model import ElasticNet, LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.decomposition import PCA


def synthetic_frame(rows: int = 240) -> pd.DataFrame:
    rng = np.random.default_rng(7)
    idx = pd.date_range("2006-01-31", periods=rows, freq="M")
    data = pd.DataFrame(
        {
            "asset_ret": rng.normal(0.006, 0.04, rows),
            "cpi_yoy": rng.normal(2.4, 1.1, rows),
            "ffr": rng.normal(2.1, 1.5, rows),
            "unemployment": rng.normal(5.2, 1.2, rows),
            "dxy": rng.normal(100, 6.5, rows),
            "oil": rng.normal(72, 15, rows),
        },
        index=idx,
    )
    return data


def model_compare() -> dict:
    df = synthetic_frame()
    X = df[["cpi_yoy", "ffr", "unemployment", "dxy", "oil"]]
    y = df["asset_ret"]
    out = {}
    for name, model in {
        "ols": LinearRegression(),
        "ridge": Ridge(alpha=1.0),
        "elastic_net": ElasticNet(alpha=0.01, l1_ratio=0.5),
        "random_forest": RandomForestRegressor(n_estimators=50, random_state=42),
    }.items():
        model.fit(X, y)
        out[name] = float(model.score(X, y))

    pca = PCA(n_components=2).fit(X)
    out["pca_explained"] = [float(x) for x in pca.explained_variance_ratio_]
    return out


def scenario_impact(shocks: dict, holdings: dict) -> dict:
    factor_map = {"cpi": -0.12, "rates": -0.25, "growth": 0.2, "oil": -0.08, "credit": -0.22}
    pnl = 0.0
    for _, weight in holdings.items():
        sensitivity = sum(shocks.get(k, 0) * v for k, v in factor_map.items())
        pnl += weight * sensitivity
    return {"portfolio_return_shock": round(pnl, 4), "confidence_band": [round(pnl-0.03,4), round(pnl+0.03,4)]}
