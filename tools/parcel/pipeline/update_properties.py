"""Parcel scoring pipeline.

TODO: Add listing ingestion connectors when source APIs/feeds are selected.
Current source of truth remains tools/parcel/data/properties.csv.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "properties.csv"
PROFILE_PATH = ROOT / "profiles" / "polo.json"
OUTPUT_DIR = ROOT / "output"
SHORTLIST_CSV = OUTPUT_DIR / "shortlist_polo.csv"
SHORTLIST_JSON = OUTPUT_DIR / "shortlist_polo.json"


def load_profile(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize_numeric(series: pd.Series) -> pd.Series:
    if series is None:
        return pd.Series(dtype="float64")
    cleaned = series.astype(str).str.replace(r"[^0-9.-]", "", regex=True)
    return pd.to_numeric(cleaned, errors="coerce")


def score_range(value: float, minimum: float, ideal: float) -> float:
    if pd.isna(value):
        return 0.0
    if value >= ideal:
        return 100.0
    if value < minimum:
        return max(0.0, (value / minimum) * 50.0)
    return 50.0 + ((value - minimum) / max(1.0, ideal - minimum)) * 50.0


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not DATA_PATH.exists() or DATA_PATH.stat().st_size == 0:
        empty_df = pd.DataFrame()
        empty_df.to_csv(SHORTLIST_CSV, index=False)
        SHORTLIST_JSON.write_text("[]\n", encoding="utf-8")
        print("Processed 0 rows. Generated empty shortlist.")
        return

    profile = load_profile(PROFILE_PATH)
    weights = profile.get("weights", {})

    df = pd.read_csv(DATA_PATH)
    row_count = len(df.index)

    if "acres" in df.columns:
        df["acres"] = normalize_numeric(df["acres"])
    else:
        df["acres"] = pd.Series([pd.NA] * row_count, dtype="float64")

    if "price" in df.columns:
        df["price"] = normalize_numeric(df["price"])
    else:
        df["price"] = pd.Series([pd.NA] * row_count, dtype="float64")

    if "price_per_acre" in df.columns:
        df["price_per_acre"] = normalize_numeric(df["price_per_acre"])
    else:
        derived = df["price"] / df["acres"].replace({0: pd.NA})
        df["price_per_acre"] = derived

    location_minutes_col = None
    for candidate in ["drive_minutes", "minutes_to_charlotte", "distance_minutes"]:
        if candidate in df.columns:
            location_minutes_col = candidate
            break

    if location_minutes_col:
        minutes = normalize_numeric(df[location_minutes_col])
    else:
        minutes = pd.Series([pd.NA] * row_count, dtype="float64")

    # Preserve manual columns if they already exist.
    if "manual_score" not in df.columns:
        df["manual_score"] = 0.0

    if "notes" not in df.columns and "investor_notes" in df.columns:
        df["notes"] = df["investor_notes"]

    min_acres = profile.get("min_acres", 20)
    ideal_acres = profile.get("ideal_min_acres", 40)
    preferred_drive = profile.get("preferred_drive_minutes", 45)
    max_drive = profile.get("max_drive_minutes", 60)

    median_price_per_acre = df["price_per_acre"].median(skipna=True)

    df["score_acreage"] = df["acres"].apply(lambda v: score_range(v, min_acres, ideal_acres))

    def score_price(v: float) -> float:
        if pd.isna(v) or pd.isna(median_price_per_acre) or median_price_per_acre <= 0:
            return 50.0
        ratio = v / median_price_per_acre
        if ratio <= 0.7:
            return 100.0
        if ratio <= 1.0:
            return 80.0
        if ratio <= 1.3:
            return 55.0
        return 25.0

    df["score_price"] = df["price_per_acre"].apply(score_price)

    def score_location(v: float) -> float:
        if pd.isna(v):
            return 50.0
        if v <= preferred_drive:
            return 100.0
        if v >= max_drive:
            return 20.0
        return 100.0 - ((v - preferred_drive) / max(1.0, max_drive - preferred_drive)) * 80.0

    df["score_location"] = minutes.apply(score_location)

    manual_weight = weights.get("manual", 0.15)
    df["score_total"] = (
        df["score_acreage"] * weights.get("acreage", 0.3)
        + df["score_price"] * weights.get("price", 0.25)
        + df["score_location"] * weights.get("location", 0.3)
        + normalize_numeric(df["manual_score"]).fillna(0) * manual_weight
    ).round(1)

    df = df.sort_values(by="score_total", ascending=False)
    shortlist = df.head(20)

    df.to_csv(DATA_PATH, index=False)
    shortlist.to_csv(SHORTLIST_CSV, index=False)

    json_records = shortlist.where(pd.notnull(shortlist), None).to_dict(orient="records")
    SHORTLIST_JSON.write_text(json.dumps(json_records, indent=2), encoding="utf-8")

    print(f"Processed {row_count} rows.")
    print(f"Generated shortlist: {len(shortlist.index)} rows.")
    print(f"Updated: {DATA_PATH}")
    print(f"Wrote: {SHORTLIST_CSV}")
    print(f"Wrote: {SHORTLIST_JSON}")


if __name__ == "__main__":
    main()
