"""Regression tests for the dependency-free entry-point documentation checker."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location(
    "ballzatram_validate_docs", Path(__file__).resolve().parents[1] / "validate_docs.py"
)
assert SPEC is not None and SPEC.loader is not None
DOCS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DOCS)


class DocumentationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)

    def write(self, name: str, text: str = "# Example\n") -> Path:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def check(self, text: str) -> list[str]:
        self.write("README.md", text)
        return DOCS.validate(self.root, ("README.md",))

    def test_valid_file_and_directory(self) -> None:
        self.write("docs/guide.md")
        self.assertEqual(self.check("[Guide](docs/guide.md) [Docs](docs/)"), [])

    def test_missing_document(self) -> None:
        self.assertIn("cannot read document", DOCS.validate(self.root, ("README.md",))[0])

    def test_missing_link(self) -> None:
        self.assertIn("missing link target", self.check("[Missing](missing.md)")[0])

    def test_nested_document_resolves_relative_to_itself(self) -> None:
        self.write("README.md")
        self.write("docs/guide.md", "[Home](../README.md)")
        self.assertEqual(DOCS.validate(self.root, ("docs/guide.md",)), [])

    def test_root_relative_link(self) -> None:
        self.write("docs/guide.md")
        self.assertEqual(self.check("[Guide](/docs/guide.md)"), [])

    def test_images_and_html_attributes(self) -> None:
        self.write("assets/art.svg", "<svg/>")
        self.assertEqual(self.check('![Art](assets/art.svg) <img src="assets/art.svg" />'), [])
        self.assertIn("missing link target", self.check('<a href="missing.html">Go</a>')[0])

    def test_fenced_code_is_ignored(self) -> None:
        self.assertEqual(self.check("```md\n[Example](missing.md)\n```"), [])

    def test_long_and_tilde_fences(self) -> None:
        text = "````md\n```\n[Example](missing.md)\n````\n~~~\n[x](also-missing)\n~~~"
        self.assertEqual(self.check(text), [])

    def test_inline_code_is_ignored(self) -> None:
        self.assertEqual(self.check("Use `[label](missing.md)` as an example."), [])

    def test_reference_definition(self) -> None:
        self.write("docs/guide.md")
        self.assertEqual(self.check('[Guide][g]\n\n[g]: docs/guide.md "Guide"'), [])
        self.assertIn("missing link target", self.check("[Bad][b]\n[b]: missing.md")[0])

    def test_same_page_anchor(self) -> None:
        self.assertEqual(self.check("# Overview\n[Top](#overview)"), [])

    def test_cross_document_and_duplicate_anchors(self) -> None:
        self.write("guide.md", "# Repeat\n## Repeat\n")
        self.assertEqual(self.check("[Second](guide.md#repeat-1)"), [])

    def test_heading_punctuation_unicode_and_code(self) -> None:
        self.write("guide.md", "# Café: `some_code` & Tests! ###\n")
        self.assertEqual(self.check("[Section](guide.md#caf%C3%A9-some_code--tests)"), [])

    def test_explicit_html_anchor(self) -> None:
        self.write("guide.md", '<a id="custom"></a>\n# Guide\n')
        self.assertEqual(self.check("[Section](guide.md#custom)"), [])

    def test_missing_anchor(self) -> None:
        self.write("guide.md")
        self.assertIn("missing Markdown anchor", self.check("[Section](guide.md#absent)")[0])

    def test_escape_is_rejected(self) -> None:
        self.assertIn("escapes repository", self.check("[Outside](../outside.md)")[0])
        self.assertIn("escapes repository", DOCS.validate(self.root, ("../outside.md",))[0])

    def test_symlink_escape_is_rejected(self) -> None:
        try:
            (self.root / "outside").symlink_to(self.root.parent, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("Symlink creation is not available")
        self.assertIn("escapes repository", self.check("[Outside](outside/)")[0])

    def test_external_links_do_not_need_network(self) -> None:
        text = "[Web](https://example.invalid/) [Email](mailto:nobody@example.invalid)"
        self.assertEqual(self.check(text), [])

    def test_unsupported_scheme(self) -> None:
        self.assertIn("unsupported link scheme", self.check("[Bad](javascript:alert)")[0])

    def test_malformed_url_is_reported(self) -> None:
        self.assertIn("invalid or unreadable", self.check("[Bad](https://[invalid/)")[0])

    def test_encoded_path_and_query(self) -> None:
        self.write("docs/a guide.md")
        self.assertEqual(self.check("[Guide](docs/a%20guide.md?raw=1#example)"), [])

    def test_angle_delimited_path_with_spaces(self) -> None:
        self.write("a guide.md")
        self.assertEqual(self.check("[Guide](<a guide.md>)"), [])


if __name__ == "__main__":
    unittest.main()
