from __future__ import annotations

import os

from app.services.market_data.demo_provider import DemoMarketDataProvider
from app.services.market_data.fred_provider import FredRatesProvider
from app.services.market_data.providers import CompositeMarketDataProvider, MarketDataProvider


def get_market_data_provider() -> MarketDataProvider:
    # Central swap point for future Yahoo/feed providers. Local demo mode intentionally needs no API keys.
    if os.getenv("FRED_API_KEY"):
        return CompositeMarketDataProvider([FredRatesProvider(), DemoMarketDataProvider()])
    return DemoMarketDataProvider()
