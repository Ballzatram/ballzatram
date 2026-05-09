from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CandidateClip:
    path: Path
    start: float
    end: float
    score: float = 0.0
    brightness: float = 0.0
    sharpness: float = 0.0

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)

    def with_scores(self, score: float, brightness: float = 0.0, sharpness: float = 0.0) -> "CandidateClip":
        return CandidateClip(self.path, self.start, self.end, score, brightness, sharpness)


@dataclass(frozen=True)
class GeneratedOutput:
    path: Path
    template: str
    score: float
