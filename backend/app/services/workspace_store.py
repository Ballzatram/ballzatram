from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class WorkspaceVersion:
    version_id: str
    created_at: str
    assumptions: dict[str, Any]
    cards: list[dict[str, Any]]
    analyst_outputs: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]
    warnings: list[dict[str, Any]]
    data_sources: list[str] = field(default_factory=list)
    summary: str = ""
    risks: list[dict[str, Any]] = field(default_factory=list)
    missing_data: list[str] = field(default_factory=list)
    recommended_next_steps: list[str] = field(default_factory=list)
    sources: list[dict[str, Any]] = field(default_factory=list)
    confidence: str = "medium"
    status: str = "complete"


@dataclass
class WorkspaceRecord:
    workspace_id: str
    title: str
    original_prompt: str
    created_at: str
    updated_at: str
    assumptions: dict[str, Any]
    selected_universe: list[str]
    versions: list[WorkspaceVersion]


class WorkspaceStore:
    def __init__(self, path: Path | None = None) -> None:
        repo_root = Path(__file__).resolve().parents[3]
        self.path = path or (repo_root / "backend" / "data" / "workspace_store.json")
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> list[WorkspaceRecord]:
        if not self.path.exists():
            return []
        raw = json.loads(self.path.read_text())
        out: list[WorkspaceRecord] = []
        for row in raw:
            versions = [WorkspaceVersion(**v) for v in row.get("versions", [])]
            out.append(WorkspaceRecord(**{**row, "versions": versions}))
        return out

    def _save(self, records: list[WorkspaceRecord]) -> None:
        self.path.write_text(json.dumps([asdict(r) for r in records], indent=2))

    def list_workspaces(self) -> list[dict[str, Any]]:
        rows = self._load()
        return [asdict(r) for r in rows]

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        rows = self._load()
        for row in rows:
            if row.workspace_id == workspace_id:
                return asdict(row)
        return None

    def create_workspace(self, title: str, prompt: str, assumptions: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
        now = _now()
        version = WorkspaceVersion(
            version_id=str(uuid4()),
            created_at=now,
            assumptions=assumptions,
            cards=result.get("cards", []),
            analyst_outputs=result.get("analystTeam", []),
            recommendations=result.get("recommendations", []),
            warnings=result.get("warnings", []),
            data_sources=result.get("dataSources", []),
            summary=result.get("summary", ""),
            risks=result.get("risks", []),
            missing_data=result.get("missingData", []),
            recommended_next_steps=result.get("recommendedNextSteps", []),
            sources=result.get("sources", []),
            confidence=result.get("confidence", "medium"),
            status=result.get("status", "complete"),
        )
        record = WorkspaceRecord(
            workspace_id=str(uuid4()),
            title=title,
            original_prompt=prompt,
            created_at=now,
            updated_at=now,
            assumptions=assumptions,
            selected_universe=assumptions.get("tickers", []),
            versions=[version],
        )
        rows = self._load()
        rows.insert(0, record)
        self._save(rows)
        return asdict(record)

    def rerun_workspace(self, workspace_id: str, assumptions: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
        rows = self._load()
        for row in rows:
            if row.workspace_id == workspace_id:
                now = _now()
                row.updated_at = now
                row.assumptions = assumptions
                row.selected_universe = assumptions.get("tickers", [])
                row.versions.append(WorkspaceVersion(
                    version_id=str(uuid4()),
                    created_at=now,
                    assumptions=assumptions,
                    cards=result.get("cards", []),
                    analyst_outputs=result.get("analystTeam", []),
                    recommendations=result.get("recommendations", []),
                    warnings=result.get("warnings", []),
                    data_sources=result.get("dataSources", []),
                    summary=result.get("summary", ""),
                    risks=result.get("risks", []),
                    missing_data=result.get("missingData", []),
                    recommended_next_steps=result.get("recommendedNextSteps", []),
                    sources=result.get("sources", []),
                    confidence=result.get("confidence", "medium"),
                    status=result.get("status", "complete"),
                ))
                self._save(rows)
                return asdict(row)
        raise KeyError("workspace not found")
