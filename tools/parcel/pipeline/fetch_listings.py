"""Web listing discovery for Parcel.

Uses search queries by geography and strategy, then extracts candidate listing URLs.
This is intentionally lightweight and should be expanded with provider-specific parsers.
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "web_discovery.json"

SEARCH_TEMPLATE = "https://duckduckgo.com/html/?q={query}"


def discover(area: str, objective: str, limit: int = 25) -> list[dict]:
    query = f"land for sale {area} {objective} site:landsearch.com OR site:land.com"
    url = SEARCH_TEMPLATE.format(query=quote_plus(query))
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    rows: list[dict] = []
    for a in soup.select("a.result__a")[:limit]:
        rows.append({"title": a.get_text(strip=True), "url": a.get("href", ""), "source": "duckduckgo"})
    return rows


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rows = discover(area="Southeast US", objective="equestrian")
    OUT.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"Discovered {len(rows)} listing candidates -> {OUT}")


if __name__ == "__main__":
    main()
