"""Build the downloadable starter deterministically from its reviewed sources."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent / "reference"
FILES = ["workflow.py", "sources.json", "config.json", "requirements.txt", "README.md", "tests/test_workflow.py", "tests/cases.json"]
with ZipFile(ROOT / "agent-workshop-starter.zip", "w", compression=ZIP_DEFLATED) as archive:
    for name in FILES:
        entry = ZipInfo(name, date_time=(2026, 10, 8, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, (ROOT / name).read_bytes())
print(f"Packaged {len(FILES)} files into the Python starter.")
