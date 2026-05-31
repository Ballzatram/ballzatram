from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "index.html",
    "lab-pass.html",
    "community.html",
    "privacy.html",
    "terms.html",
    "data/tool-inventory.json",
    "data/status-taxonomy.json",
    "docs/MONETIZATION_READINESS.md",
    "docs/SCALE_TO_10K.md",
    "docs/PROPOSED_LAB_PASS_SCHEMA.md",
]

INVENTORY_FIELDS = {
    "id",
    "title",
    "category",
    "href",
    "status",
    "maturity",
    "shortDescription",
    "whyItExists",
    "memberPotential",
    "riskLevel",
    "safetyNote",
    "tags",
    "heavyCompute",
    "requiresBackend",
    "freePreview",
}

STATUSES = {
    "Toy",
    "Prototype",
    "Playable",
    "Alpha",
    "Beta",
    "Stable",
    "Paper Mode",
    "Backend Required",
    "Roadmap",
    "Retired",
}

CATEGORIES = {
    "Tool",
    "Game",
    "Simulation",
    "AI Toy",
    "Weird Experiment",
    "Writing/Story",
    "Utility",
    "Roadmap",
}

RISK_LEVELS = {"low", "medium", "high"}

FORBIDDEN_STATIC_PHRASES = [
    "guaranteed profit",
    "guaranteed return",
    "investment advice",
    "live orders enabled",
    "verified land deal",
    "subscribe now",
    "unlimited rendering",
    "guaranteed uptime",
]


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def add_failure(failures: list[str], message: str) -> None:
    failures.append(message)


def validate_required_files(failures: list[str]) -> None:
    for relative_path in REQUIRED_FILES:
        if not (ROOT / relative_path).exists():
            add_failure(failures, f"Missing required file: {relative_path}")


def load_json(relative_path: str, failures: list[str]):
    try:
        return json.loads(read_text(relative_path))
    except Exception as exc:  # noqa: BLE001 - validation script should report any parse issue.
        add_failure(failures, f"{relative_path} does not parse as JSON: {exc}")
        return None


def validate_inventory(failures: list[str]) -> None:
    inventory = load_json("data/tool-inventory.json", failures)
    if not isinstance(inventory, list):
        add_failure(failures, "data/tool-inventory.json must contain a list")
        return

    for index, item in enumerate(inventory):
        if not isinstance(item, dict):
            add_failure(failures, f"Inventory item {index} is not an object")
            continue
        missing = INVENTORY_FIELDS - set(item)
        if missing:
            add_failure(failures, f"Inventory item {item.get('id', index)} missing fields: {sorted(missing)}")
        if item.get("status") not in STATUSES:
            add_failure(failures, f"Inventory item {item.get('id', index)} has invalid status: {item.get('status')}")
        if item.get("category") not in CATEGORIES:
            add_failure(failures, f"Inventory item {item.get('id', index)} has invalid category: {item.get('category')}")
        if item.get("riskLevel") not in RISK_LEVELS:
            add_failure(failures, f"Inventory item {item.get('id', index)} has invalid riskLevel: {item.get('riskLevel')}")
        for bool_field in ["memberPotential", "heavyCompute", "requiresBackend", "freePreview"]:
            if not isinstance(item.get(bool_field), bool):
                add_failure(failures, f"Inventory item {item.get('id', index)} field {bool_field} must be boolean")
        if not isinstance(item.get("tags"), list):
            add_failure(failures, f"Inventory item {item.get('id', index)} tags must be a list")


def validate_status_taxonomy(failures: list[str]) -> None:
    taxonomy = load_json("data/status-taxonomy.json", failures)
    if not isinstance(taxonomy, list):
        add_failure(failures, "data/status-taxonomy.json must contain a list")
        return

    labels = {item.get("label") for item in taxonomy if isinstance(item, dict)}
    if labels != STATUSES:
        add_failure(failures, f"Status taxonomy labels do not match expected labels: {sorted(labels)}")

    for item in taxonomy:
        if not isinstance(item, dict):
            add_failure(failures, "Status taxonomy item is not an object")
            continue
        for field in ["label", "shortDescription", "userExpectation", "paidEligible"]:
            if field not in item:
                add_failure(failures, f"Status {item.get('label', '<unknown>')} missing {field}")
        if not isinstance(item.get("paidEligible"), bool):
            add_failure(failures, f"Status {item.get('label', '<unknown>')} paidEligible must be boolean")


def validate_homepage_links(failures: list[str]) -> None:
    homepage = read_text("index.html").lower()
    for href in ["lab-pass.html", "community.html", "privacy.html", "terms.html"]:
        if href not in homepage:
            add_failure(failures, f"Homepage missing footer/nav link to {href}")


def validate_lab_pass(failures: list[str]) -> None:
    lab_pass = read_text("lab-pass.html").lower()
    if "checkout is not live yet" not in lab_pass:
        add_failure(failures, "Lab Pass page must say checkout is not live yet")
    if "$10/month" not in lab_pass:
        add_failure(failures, "Lab Pass page must include $10/month")


def validate_weather_guardrails(failures: list[str]) -> None:
    weather = read_text("weather-bot.html").lower()
    checks = {
        "paper": "paper",
        "Not financial advice": "not financial advice",
        "private key boundary": "never asks for private keys",
        "live order boundary": "never places live orders",
    }
    for label, phrase in checks.items():
        if phrase not in weather:
            add_failure(failures, f"Weather page missing guardrail language: {label}")


def validate_parcel_guardrails(failures: list[str]) -> None:
    parcel_text = "\n".join(
        [
            read_text("tools/parcel/index.html"),
            read_text("tools/parcel/script.js"),
            read_text("tools/parcel/README.md"),
        ]
    ).lower()
    for phrase in ["source", "truth", "diligence"]:
        if phrase not in parcel_text:
            add_failure(failures, f"Parcel guardrails missing {phrase} language")
    if not any(phrase in parcel_text for phrase in ["verification", "verify", "verified", "validating"]):
        add_failure(failures, "Parcel guardrails missing verification language")


def validate_ai_edit_guardrails(failures: list[str]) -> None:
    ai_edit_readme = read_text("ai-edit-factory/README.md").lower()
    if "rights-approved" not in ai_edit_readme and "permission" not in ai_edit_readme:
        add_failure(failures, "AI Edit README missing rights-approved or permission language")


def public_static_pages() -> list[Path]:
    skipped_parts = {"node_modules", ".next", ".git"}
    return [
        path
        for path in ROOT.rglob("*.html")
        if not skipped_parts.intersection(path.parts)
    ]


def validate_forbidden_static_phrases(failures: list[str]) -> None:
    for path in public_static_pages():
        text = path.read_text(encoding="utf-8", errors="ignore").lower()
        for phrase in FORBIDDEN_STATIC_PHRASES:
            if phrase in text:
                add_failure(failures, f"Forbidden phrase '{phrase}' found in {path.relative_to(ROOT)}")


def main() -> int:
    failures: list[str] = []
    validate_required_files(failures)
    validate_inventory(failures)
    validate_status_taxonomy(failures)
    validate_homepage_links(failures)
    validate_lab_pass(failures)
    validate_weather_guardrails(failures)
    validate_parcel_guardrails(failures)
    validate_ai_edit_guardrails(failures)
    validate_forbidden_static_phrases(failures)

    if failures:
        print("Lab readiness validation failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Lab readiness validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
