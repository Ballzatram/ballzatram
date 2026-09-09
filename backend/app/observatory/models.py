"""Structural evidence contracts, not a factual-verification or legal-review system.

These models use the repository's existing Pydantic dependency. Never accept
reviewer identity or publication authorization from an untrusted client.
"""
from __future__ import annotations

from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, model_validator

Text = Annotated[str, Field(min_length=1)]
Identifier = Annotated[str, Field(min_length=1, max_length=160)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)


class SourceRecord(Contract):
    id: Identifier
    url: HttpUrl
    retrieved_at: AwareDatetime
    content_sha256: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]
    source_kind: Literal["official_record", "primary_statement", "news_report", "research", "synthetic"]
    reuse_status: Literal["permitted", "restricted", "unreviewed"]
    rights_note: Text


class Entity(Contract):
    id: Identifier
    kind: Literal["person", "organization", "promise", "vote", "bill", "bill_version",
                  "provision", "rule", "award", "outcome", "event", "country", "article"]
    label: Text


class EvidenceSpan(Contract):
    source_id: Identifier
    locator: Text  # e.g. XML section ID, PDF page, or transcript timestamp
    excerpt: Text | None = None  # optional; rights may permit a locator but not quotation
    role: Literal["supporting", "challenging", "context"]
    verified_against_snapshot: bool = False


class Claim(Contract):
    id: Identifier
    subject_id: Identifier
    predicate: Text
    object_id: Identifier
    statement: Text
    kind: Literal["recorded_fact", "inference", "hypothesis"]
    evidence: Annotated[tuple[EvidenceSpan, ...], Field(min_length=1)]
    confidence: Literal["unassessed", "low", "medium", "high"] = "unassessed"
    limitations: Annotated[tuple[Text, ...], Field(min_length=1)]
    counterevidence_search_note: Text | None = None
    review_state: Literal["draft", "reviewed"] = "draft"
    reviewer_ids: tuple[Identifier, ...] = ()
    reviewed_at: AwareDatetime | None = None
    high_stakes: bool = True

    @model_validator(mode="after")
    def validate_review(self) -> Claim:
        if not any(item.role == "supporting" for item in self.evidence):
            raise ValueError("A claim requires supporting evidence, not just contextual links")
        if len(set(self.reviewer_ids)) != len(self.reviewer_ids):
            raise ValueError("Reviewer IDs must be distinct")
        if self.review_state == "reviewed":
            required = 2 if self.high_stakes else 1
            if len(self.reviewer_ids) < required or self.reviewed_at is None:
                raise ValueError("Reviewed claims require named, timestamped independent reviews")
        return self


class EvidenceBundle(Contract):
    schema_version: Literal["0.1.0"] = "0.1.0"
    id: Identifier
    mode: Literal["draft", "demo", "publication"]
    created_at: AwareDatetime
    methodology_version: Text
    sources: Annotated[tuple[SourceRecord, ...], Field(min_length=1)]
    entities: Annotated[tuple[Entity, ...], Field(min_length=1)]
    claims: Annotated[tuple[Claim, ...], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_bundle(self) -> EvidenceBundle:
        for label, records in (("sources", self.sources), ("entities", self.entities), ("claims", self.claims)):
            ids = [record.id for record in records]
            if len(ids) != len(set(ids)):
                raise ValueError(f"Duplicate IDs in {label}")
        sources = {source.id: source for source in self.sources}
        entity_ids = {entity.id for entity in self.entities}
        for source in self.sources:
            if source.retrieved_at > self.created_at:
                raise ValueError("A bundle cannot predate its source retrieval")
            if self.mode == "demo" and source.source_kind != "synthetic":
                raise ValueError("Demo bundles must contain only synthetic sources")
            if self.mode == "publication":
                host = source.url.host or ""
                if source.source_kind == "synthetic" or host == "invalid" or host.endswith(".invalid"):
                    raise ValueError("Synthetic sources cannot enter publication bundles")
                if source.reuse_status != "permitted":
                    raise ValueError("Publication requires documented permitted use for every source")
        for claim in self.claims:
            if claim.subject_id not in entity_ids or claim.object_id not in entity_ids:
                raise ValueError("Claim references an unknown entity")
            for item in claim.evidence:
                if item.source_id not in sources:
                    raise ValueError("Evidence references an unknown source")
                if claim.reviewed_at is not None and claim.reviewed_at < sources[item.source_id].retrieved_at:
                    raise ValueError("A review cannot predate the evidence snapshot")
                if self.mode == "publication" and not item.verified_against_snapshot:
                    raise ValueError("Publication requires snapshot-verified evidence spans")
            if claim.reviewed_at is not None and claim.reviewed_at > self.created_at:
                raise ValueError("A bundle cannot predate a claimed review")
            if self.mode == "publication":
                if claim.review_state != "reviewed":
                    raise ValueError("Draft claims cannot enter publication bundles")
                if claim.confidence == "unassessed" or not claim.counterevidence_search_note:
                    raise ValueError("Publication requires confidence assessment and a counterevidence search note")
        return self
