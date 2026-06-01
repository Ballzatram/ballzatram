import unittest

import pandas as pd

from app.analytics.quant_library import (
    beta_vs_benchmark,
    correlation_matrix,
    cumulative_returns,
    daily_returns,
    max_drawdown,
    moving_average,
    relative_strength_index,
    rolling_volatility,
    yield_curve_spreads,
)
from app.services.market_data.demo_provider import DemoMarketDataProvider
from app.services.quant_library import build_analytics_demo


class QuantLibraryFoundationTests(unittest.TestCase):
    def test_daily_and_cumulative_returns(self):
        prices = pd.Series([100, 110, 99], index=pd.date_range("2024-01-01", periods=3))
        returns = daily_returns(prices)
        self.assertAlmostEqual(returns.iloc[0], 0.10)
        self.assertAlmostEqual(returns.iloc[1], -0.10)
        cumulative = cumulative_returns(returns)
        self.assertAlmostEqual(cumulative.iloc[-1], -0.01)

    def test_max_drawdown_and_moving_average(self):
        returns = pd.Series([0.10, -0.20, 0.05], index=pd.date_range("2024-01-01", periods=3))
        self.assertAlmostEqual(max_drawdown(returns), -0.20)

        prices = pd.Series([10, 20, 30, 40], index=pd.date_range("2024-01-01", periods=4))
        average = moving_average(prices, 2)
        self.assertAlmostEqual(average.iloc[-1], 35)

    def test_rolling_volatility_and_rsi(self):
        prices = pd.Series(range(1, 31), index=pd.date_range("2024-01-01", periods=30))
        returns = daily_returns(prices)
        volatility = rolling_volatility(returns, window=5)
        self.assertGreaterEqual(volatility.dropna().iloc[-1], 0)

        rsi = relative_strength_index(prices, window=14)
        self.assertAlmostEqual(rsi.iloc[-1], 100)

    def test_beta_correlation_and_curve_spreads(self):
        idx = pd.date_range("2024-01-01", periods=6)
        benchmark = pd.Series([0.01, 0.02, -0.01, 0.03, -0.02, 0.01], index=idx)
        asset = benchmark * 2
        self.assertAlmostEqual(beta_vs_benchmark(asset, benchmark), 2)

        matrix = correlation_matrix({"asset": asset, "benchmark": benchmark})
        self.assertEqual(matrix["columns"], ["asset", "benchmark"])
        self.assertAlmostEqual(matrix["matrix"][0][1], 1)

        rates = {
            "TB3MS": pd.Series([4.8, 4.7], index=idx[:2]),
            "DGS2": pd.Series([4.5, 4.4], index=idx[:2]),
            "DGS10": pd.Series([4.0, 4.2], index=idx[:2]),
        }
        spreads = yield_curve_spreads(rates)
        self.assertAlmostEqual(spreads["2y10y"]["latest"], -0.2)
        self.assertAlmostEqual(spreads["3m10y"]["latest"], -0.5)

    def test_demo_provider_returns_fallback_quotes_and_universe(self):
        provider = DemoMarketDataProvider()
        universe = provider.get_universe("major-us-indices")
        quote = provider.get_quote(universe.items[0].symbol)
        curve = provider.get_yield_curve()

        self.assertTrue(universe.items)
        self.assertEqual(quote.freshness.status, "fallback")
        self.assertEqual(curve.points[-1].tenor, "30Y")

    def test_quant_library_analytics_demo_service_payload(self):
        payload = build_analytics_demo(["SPY", "QQQ"], benchmark="SPY")

        self.assertEqual(payload["provider"], "demo-fallback")
        self.assertTrue(payload["symbols"])
        self.assertIn("maxDrawdown", payload["symbols"][0]["metrics"])
        self.assertIn("maxDrawdown", payload["explanations"])
        self.assertEqual(payload["rates"]["spreads"]["2y10y"]["status"], "available")


if __name__ == "__main__":
    unittest.main()
