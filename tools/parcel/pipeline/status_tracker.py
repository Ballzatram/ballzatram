from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "shortlist_polo.json"

if __name__ == "__main__":
    if OUTPUT.exists() and OUTPUT.stat().st_size > 2:
        print("Parcel shortlist output exists and is non-empty.")
    else:
        print("Parcel shortlist output missing or empty.")
