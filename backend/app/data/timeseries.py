from __future__ import annotations

from io import StringIO
from pathlib import Path
from typing import Iterable

import pandas as pd

from app.models.schemas import MissingPolicy

CACHE: dict[str, pd.DataFrame] = {}


def load_demo_series(cache_key: str = "demo") -> pd.DataFrame:
    if cache_key in CACHE:
        return CACHE[cache_key].copy()
    repo_root = Path(__file__).resolve().parents[3]
    path = repo_root / "demo_data" / "macro_timeseries.csv"
    df = pd.read_csv(path, parse_dates=["date"]).set_index("date").sort_index()
    CACHE[cache_key] = df
    return df.copy()


def parse_uploaded_csv(csv_text: str, date_col: str = "date") -> pd.DataFrame:
    df = pd.read_csv(StringIO(csv_text))
    if date_col not in df.columns:
        raise ValueError(f"missing date column: {date_col}")
    df[date_col] = pd.to_datetime(df[date_col])
    return df.set_index(date_col).sort_index()


def normalize_frequency(frequency: str) -> str:
    # Pandas 3 removed the legacy month-end alias "M"; the API contract still
    # accepts "M", so translate at the data boundary rather than changing callers.
    return "ME" if frequency == "M" else frequency


def align_and_normalize(
    frames: Iterable[pd.DataFrame],
    frequency: str = "M",
    missing_policy: MissingPolicy = MissingPolicy.interpolate,
) -> pd.DataFrame:
    merged = pd.concat(frames, axis=1).sort_index()
    merged = merged.resample(normalize_frequency(frequency)).last()
    if missing_policy == MissingPolicy.drop:
        merged = merged.dropna()
    elif missing_policy == MissingPolicy.interpolate:
        merged = merged.interpolate(limit_direction="both")
    else:
        merged = merged.ffill().bfill()
    return merged
