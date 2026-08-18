from __future__ import annotations

import os

from app.services.market_data.alpha_vantage_provider import AlphaVantageMarketDataProvider
from app.services.market_data.demo_provider import DemoMarketDataProvider
from app.services.market_data.fred_provider import FredRatesProvider
from app.services.market_data.providers import CompositeMarketDataProvider, MarketDataProvider


def get_market_data_provider() -> MarketDataProvider:
    """Build the provider chain from server-side configuration.

    Live providers are tried before the bundled demo provider. Unsupported
    methods and provider failures fall through via CompositeMarketDataProvider,
    so a rates-only FRED adapter and an equity-only Alpha Vantage adapter can
    coexist behind one stable frontend/backend contract.
    """

    providers: list[MarketDataProvider] = []
    if os.getenv("ALPHA_VANTAGE_API_KEY") or os.getenv("MARKET_DATA_API_KEY"):
        providers.append(AlphaVantageMarketDataProvider())
    if os.getenv("FRED_API_KEY"):
        providers.append(FredRatesProvider())
    providers.append(DemoMarketDataProvider())

    if len(providers) == 1:
        return providers[0]
    return CompositeMarketDataProvider(providers)
