from __future__ import annotations

from app.services.market_data.models import MarketUniverse, UniverseItem


def item(symbol: str, name: str, asset_class: str, category: str, description: str = "") -> UniverseItem:
    return UniverseItem(symbol=symbol, name=name, asset_class=asset_class, category=category, description=description)


MARKET_UNIVERSES: dict[str, MarketUniverse] = {
    "major-us-indices": MarketUniverse(
        id="major-us-indices",
        title="Major US indices",
        description="Broad index proxies used for market context and benchmark comparisons.",
        items=[
            item("SPY", "S&P 500 ETF", "ETF", "US large-cap index"),
            item("QQQ", "Nasdaq-100 ETF", "ETF", "US growth index"),
            item("DIA", "Dow Industrials ETF", "ETF", "US blue-chip index"),
            item("IWM", "Russell 2000 ETF", "ETF", "US small-cap index"),
        ],
    ),
    "sector-etfs": MarketUniverse(
        id="sector-etfs",
        title="Sector ETFs",
        description="Common US sector ETF proxies for breadth and leadership checks.",
        items=[
            item("XLK", "Technology Select Sector SPDR", "ETF", "Sector"),
            item("XLF", "Financial Select Sector SPDR", "ETF", "Sector"),
            item("XLE", "Energy Select Sector SPDR", "ETF", "Sector"),
            item("XLV", "Health Care Select Sector SPDR", "ETF", "Sector"),
            item("XLI", "Industrial Select Sector SPDR", "ETF", "Sector"),
            item("XLP", "Consumer Staples Select Sector SPDR", "ETF", "Sector"),
            item("XLY", "Consumer Discretionary Select Sector SPDR", "ETF", "Sector"),
            item("XLU", "Utilities Select Sector SPDR", "ETF", "Sector"),
        ],
    ),
    "international-etfs": MarketUniverse(
        id="international-etfs",
        title="International ETFs",
        description="Broad international and regional ETF proxies.",
        items=[
            item("VEA", "Developed Markets ETF", "ETF", "International"),
            item("EFA", "EAFE ETF", "ETF", "International"),
            item("EEM", "Emerging Markets ETF", "ETF", "International"),
            item("EWJ", "Japan ETF", "ETF", "International"),
            item("FXI", "China Large-Cap ETF", "ETF", "International"),
        ],
    ),
    "mega-cap-tech": MarketUniverse(
        id="mega-cap-tech",
        title="Mega-cap tech",
        description="Large technology and platform companies often used for concentration checks.",
        items=[
            item("AAPL", "Apple", "Equity", "Mega-cap technology"),
            item("MSFT", "Microsoft", "Equity", "Mega-cap technology"),
            item("NVDA", "NVIDIA", "Equity", "Mega-cap technology"),
            item("AMZN", "Amazon", "Equity", "Mega-cap technology"),
            item("GOOGL", "Alphabet", "Equity", "Mega-cap technology"),
            item("META", "Meta Platforms", "Equity", "Mega-cap technology"),
        ],
    ),
    "defensive-equities": MarketUniverse(
        id="defensive-equities",
        title="Defensive equities",
        description="Large companies commonly used as defensive-sector examples.",
        items=[
            item("PG", "Procter & Gamble", "Equity", "Consumer staples"),
            item("KO", "Coca-Cola", "Equity", "Consumer staples"),
            item("PEP", "PepsiCo", "Equity", "Consumer staples"),
            item("JNJ", "Johnson & Johnson", "Equity", "Health care"),
            item("WMT", "Walmart", "Equity", "Consumer staples"),
            item("MCD", "McDonald's", "Equity", "Consumer staples"),
        ],
    ),
    "small-caps": MarketUniverse(
        id="small-caps",
        title="Small caps",
        description="Small-cap and size-factor proxies for breadth and financing-condition checks.",
        items=[
            item("IWM", "Russell 2000 ETF", "ETF", "Small caps"),
            item("IJR", "S&P Small-Cap ETF", "ETF", "Small caps"),
            item("VB", "Vanguard Small-Cap ETF", "ETF", "Small caps"),
            item("SCHA", "Schwab US Small-Cap ETF", "ETF", "Small caps"),
        ],
    ),
    "rates-sensitive-assets": MarketUniverse(
        id="rates-sensitive-assets",
        title="Rates-sensitive assets",
        description="Assets often reviewed when rates, duration, credit, or real-yield pressure changes.",
        items=[
            item("TLT", "20+ Year Treasury Bond ETF", "ETF", "Long-duration rates"),
            item("IEF", "7-10 Year Treasury Bond ETF", "ETF", "Intermediate rates"),
            item("SHY", "1-3 Year Treasury Bond ETF", "ETF", "Short-duration rates"),
            item("LQD", "Investment Grade Corporate Bond ETF", "ETF", "Credit"),
            item("HYG", "High Yield Corporate Bond ETF", "ETF", "Credit"),
            item("VNQ", "Real Estate ETF", "ETF", "Rate-sensitive equity"),
            item("XLU", "Utilities Select Sector SPDR", "ETF", "Rate-sensitive equity"),
        ],
    ),
}


def list_universes() -> list[MarketUniverse]:
    return list(MARKET_UNIVERSES.values())


def get_universe(universe_id: str) -> MarketUniverse | None:
    return MARKET_UNIVERSES.get(universe_id)


def symbol_name(symbol: str) -> str:
    normalized = symbol.upper()
    for universe in MARKET_UNIVERSES.values():
        for universe_item in universe.items:
            if universe_item.symbol == normalized:
                return universe_item.name
    return normalized

