import { isWeatherSnapshotStale, type WeatherFreshnessCheck, type WeatherSnapshot } from "./types.js";

export interface SourceConsensusOptions {
  now?: Date;
  maxAgeMs?: number;
  temperatureDisagreementC?: number;
  precipitationProbabilityDisagreementPercent?: number;
  windSpeedDisagreementKph?: number;
  staleHaircut?: number;
  disagreementHaircut?: number;
}

export interface SourceConsensusResult {
  confidenceMultiplier: number;
  staleSources: Array<{ source: WeatherSnapshot["source"]; freshness: WeatherFreshnessCheck }>;
  disagreements: string[];
  usableSnapshots: WeatherSnapshot[];
}

export function assessSourceConsensus(
  snapshots: WeatherSnapshot[],
  options: SourceConsensusOptions = {},
): SourceConsensusResult {
  const maxAgeMs = options.maxAgeMs ?? 60 * 60 * 1000;
  const staleHaircut = options.staleHaircut ?? 0.15;
  const disagreementHaircut = options.disagreementHaircut ?? 0.2;
  const staleSources: SourceConsensusResult["staleSources"] = [];
  const disagreements: string[] = [];

  for (const snapshot of snapshots) {
    const freshness = isWeatherSnapshotStale(snapshot, options.now, maxAgeMs);
    if (freshness.stale) {
      staleSources.push({ source: snapshot.source, freshness });
    }
  }

  const usableSnapshots = snapshots.filter(
    (snapshot) => !staleSources.some((stale) => stale.source === snapshot.source),
  );

  addSpreadDisagreement(
    disagreements,
    usableSnapshots,
    "temperatureC",
    options.temperatureDisagreementC ?? 4,
    "temperature",
  );
  addSpreadDisagreement(
    disagreements,
    usableSnapshots,
    "precipitationProbabilityPercent",
    options.precipitationProbabilityDisagreementPercent ?? 30,
    "precipitation probability",
  );
  addSpreadDisagreement(
    disagreements,
    usableSnapshots,
    "windSpeedKph",
    options.windSpeedDisagreementKph ?? 20,
    "wind speed",
  );

  const haircut = staleSources.length * staleHaircut + disagreements.length * disagreementHaircut;
  return {
    confidenceMultiplier: Math.max(0, roundTo(1 - haircut, 2)),
    staleSources,
    disagreements,
    usableSnapshots,
  };
}

function addSpreadDisagreement(
  disagreements: string[],
  snapshots: WeatherSnapshot[],
  key: "temperatureC" | "precipitationProbabilityPercent" | "windSpeedKph",
  threshold: number,
  label: string,
): void {
  const values = snapshots
    .map((snapshot) => snapshot[key])
    .filter((value): value is number => typeof value === "number");

  if (values.length < 2) {
    return;
  }

  const spread = Math.max(...values) - Math.min(...values);
  if (spread > threshold) {
    disagreements.push(`${label} spread ${roundTo(spread, 2)} exceeds threshold ${threshold}`);
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
