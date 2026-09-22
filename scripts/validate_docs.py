"""Check local links in curated entry-point docs, using only the standard library.

Supports ordinary inline Markdown links/images, reference definitions, HTML
href/src attributes, and ATX Markdown heading anchors. This is intentionally not
a full Markdown parser, an external URL crawler, or an audit of all legacy docs.
"""
from __future__ import annotations

from collections.abc import Iterable
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = (
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "docs/README.md",
    "docs/ENGINEERING_TOUR.md",
    "docs/DEVELOPMENT.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
)
INLINE_LINK = re.compile(
    r"(?<!\\)!?\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))"
    r"(?:\s+['\"][^'\"\n]*['\"])?\s*\)"
)
REFERENCE = re.compile(r"^\s{0,3}\[[^\]\n]+\]:\s*(?:<([^>\n]+)>|(\S+))", re.M)


def without_fences(text: str) -> str:
    """Ignore fenced examples, including fences longer than three characters."""
    kept = []
    fence = ""
    for line in text.splitlines():
        match = re.match(r"^\s{0,3}(`{3,}|~{3,})(.*)$", line)
        if match:
            marker, suffix = match.groups()
            if not fence:
                fence = marker
                continue
            if marker[0] == fence[0] and len(marker) >= len(fence) and not suffix.strip():
                fence = ""
                continue
        if not fence:
            kept.append(line)
    return "\n".join(kept)


class HTMLReferences(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.targets: list[str] = []
        self.anchors: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if value is None:
                continue
            if key in {"href", "src"}:
                self.targets.append(value)
            if key == "id" or (tag == "a" and key == "name"):
                self.anchors.add(value)


def targets(text: str) -> set[str]:
    text = without_fences(text)
    # Do not treat illustrative inline code as a real link.
    text = re.sub(r"(`+)(.+?)\1", "", text)
    found = set()
    for pattern in (INLINE_LINK, REFERENCE):
        found.update(a or b for a, b in pattern.findall(text))
    parser = HTMLReferences()
    parser.feed(text)
    found.update(parser.targets)
    return found


def anchors(text: str) -> set[str]:
    text = without_fences(text)
    parser = HTMLReferences()
    parser.feed(text)
    found = set(parser.anchors)
    generated: set[str] = set()
    for heading in re.findall(r"^\s{0,3}#{1,6}\s+(.+?)\s*$", text, re.M):
        heading = re.sub(r"\s+#+\s*$", "", heading)
        base = re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
        slug = base
        index = 0
        while slug in generated:
            index += 1
            slug = f"{base}-{index}"
        generated.add(slug)
        found.add(slug)
    return found


def validate(root: Path, documents: Iterable[str] = DOCUMENTS) -> list[str]:
    root = root.resolve()
    failures: list[str] = []
    for name in documents:
        source = (root / name).resolve()
        if not source.is_relative_to(root):
            failures.append(f"{name}: document escapes repository")
            continue
        try:
            text = source.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            failures.append(f"{name}: cannot read document ({exc})")
            continue
        for target in sorted(targets(text)):
            try:
                url = urlsplit(target)
                if url.scheme or url.netloc:
                    if url.scheme not in {"", "http", "https", "mailto"}:
                        failures.append(f"{name}: unsupported link scheme: {target}")
                    continue
                path = unquote(url.path)
                destination = (
                    root / path.lstrip("/") if path.startswith("/")
                    else source.parent / path if path else source
                ).resolve()
                if not destination.is_relative_to(root):
                    failures.append(f"{name}: link escapes repository: {target}")
                elif not destination.exists():
                    failures.append(f"{name}: missing link target: {target}")
                elif url.fragment and destination.suffix.lower() == ".md":
                    available = anchors(destination.read_text(encoding="utf-8"))
                    if unquote(url.fragment) not in available:
                        failures.append(f"{name}: missing Markdown anchor: {target}")
            except (OSError, UnicodeError, ValueError) as exc:
                failures.append(f"{name}: invalid or unreadable target {target!r} ({exc})")
    return failures


def main() -> int:
    failures = validate(ROOT)
    if failures:
        print("Documentation validation failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print(f"Documentation validation passed ({len(DOCUMENTS)} curated files; local links only).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
