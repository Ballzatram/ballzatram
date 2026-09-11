"""Offline contract tests. Every object below is synthetic, including publication tests."""
from copy import deepcopy
from pathlib import Path
import json

import pytest
from pydantic import ValidationError

from app.observatory.models import EvidenceBundle

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def demo():
    return json.loads((ROOT / "demo_data/observatory/evidence-bundle.json").read_text())


@pytest.fixture
def publication(demo):
    # A valid structural test object, NOT a verified real-world finding.
    item = deepcopy(demo)
    item["mode"] = "publication"
    item["sources"][0].update(source_kind="official_record", url="https://www.congress.gov/", reuse_status="permitted")
    claim = item["claims"][0]
    claim.update(review_state="reviewed", reviewer_ids=["test-reviewer-a", "test-reviewer-b"],
                 reviewed_at="2026-09-08T12:30:00Z", confidence="medium",
                 counterevidence_search_note="Synthetic test: no real counterevidence search performed.")
    claim["evidence"][0]["verified_against_snapshot"] = True
    return item


def test_demo_round_trip(demo):
    model = EvidenceBundle.model_validate(demo)
    assert EvidenceBundle.model_validate_json(model.model_dump_json()) == model


def test_valid_publication_contract(publication):
    assert EvidenceBundle.model_validate(publication).mode == "publication"


def test_extra_fields_fail(demo):
    demo["corruption_score"] = 99
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(demo)


@pytest.mark.parametrize("collection", ["sources", "entities", "claims"])
def test_duplicate_ids_fail(demo, collection):
    demo[collection].append(deepcopy(demo[collection][0]))
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(demo)


@pytest.mark.parametrize("field", ["subject_id", "object_id"])
def test_unknown_entities_fail(demo, field):
    demo["claims"][0][field] = "missing"
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(demo)


def test_unknown_source_fails(demo):
    demo["claims"][0]["evidence"][0]["source_id"] = "missing"
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(demo)


def test_context_is_not_support(demo):
    demo["claims"][0]["evidence"][0]["role"] = "context"
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(demo)


@pytest.mark.parametrize("status", ["restricted", "unreviewed"])
def test_unapproved_rights_fail(publication, status):
    publication["sources"][0]["reuse_status"] = status
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(publication)


@pytest.mark.parametrize("mutation", ["synthetic", "invalid_host", "unverified", "draft", "unassessed",
                                     "no_counterevidence", "one_reviewer", "same_reviewer", "missing_review_time"])
def test_publication_guards(publication, mutation):
    source, claim = publication["sources"][0], publication["claims"][0]
    if mutation == "synthetic": source["source_kind"] = "synthetic"
    elif mutation == "invalid_host": source["url"] = "https://fixture.invalid/"
    elif mutation == "unverified": claim["evidence"][0]["verified_against_snapshot"] = False
    elif mutation == "draft": claim["review_state"] = "draft"
    elif mutation == "unassessed": claim["confidence"] = "unassessed"
    elif mutation == "no_counterevidence": claim["counterevidence_search_note"] = None
    elif mutation == "one_reviewer": claim["reviewer_ids"] = ["reviewer-a"]
    elif mutation == "same_reviewer": claim["reviewer_ids"] = ["reviewer-a", "reviewer-a"]
    elif mutation == "missing_review_time": claim["reviewed_at"] = None
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(publication)


@pytest.mark.parametrize("mutation", ["naive_time", "late_retrieval", "early_review", "late_review", "bad_hash", "blank_statement", "empty_evidence", "empty_limits"])
def test_integrity_guards(publication, mutation):
    source, claim = publication["sources"][0], publication["claims"][0]
    if mutation == "naive_time": source["retrieved_at"] = "2026-09-08T12:00:00"
    elif mutation == "late_retrieval": source["retrieved_at"] = "2026-09-09T12:00:00Z"
    elif mutation == "early_review": claim["reviewed_at"] = "2026-09-07T12:00:00Z"
    elif mutation == "late_review": claim["reviewed_at"] = "2026-09-09T12:00:00Z"
    elif mutation == "bad_hash": source["content_sha256"] = "not-a-hash"
    elif mutation == "blank_statement": claim["statement"] = "   "
    elif mutation == "empty_evidence": claim["evidence"] = []
    elif mutation == "empty_limits": claim["limitations"] = []
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(publication)


def test_real_source_cannot_be_mislabeled_demo(demo):
    demo["sources"][0]["source_kind"] = "official_record"
    with pytest.raises(ValidationError):
        EvidenceBundle.model_validate(demo)


def test_schema_can_be_exported():
    schema = EvidenceBundle.model_json_schema()
    assert schema["title"] == "EvidenceBundle"
    assert "SourceRecord" in schema["$defs"]


def test_synthetic_snapshot_hash(demo):
    import hashlib
    content = (ROOT / "demo_data/observatory/source.txt").read_bytes()
    assert hashlib.sha256(content).hexdigest() == demo["sources"][0]["content_sha256"]
