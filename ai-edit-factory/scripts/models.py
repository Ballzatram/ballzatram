from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CandidateClip:
    """A short source-video range that can be used in an edit."""

    path: Path
    start: float
    end: float
    score: float = 0.0

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)

    def with_score(self, score: float) -> "CandidateClip":
        return CandidateClip(path=self.path, start=self.start, end=self.end, score=score)
