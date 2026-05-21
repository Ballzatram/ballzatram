import type { Logger } from "../logger/logger.js";
import type { ParsedWeatherMarket } from "../strategy/marketParser.js";
import { assessSourceConsensus } from "./sourceConsensus.js";
import type { Coordinates, WeatherSnapshot, WeatherSourceName } from "./types.js";
import type { WeatherSourceRegistry } from "./sourceRegistry.js";

export interface WeatherSnapshotResolverOptions {
  parsedMarket: ParsedWeatherMarket;
  registry: WeatherSourceRegistry;
  logger: Logger;
}

export type WeatherDataStatus = "resolved" | "skipped" | "failed";

export interface WeatherSnapshotResolution {
  status: WeatherDataStatus;
  snapshots: WeatherSnapshot[];
  sourcesUsed: WeatherSourceName[];
  reasons: string[];
}

export async function resolveWeatherSnapshots(options: WeatherSnapshotResolverOptions): Promise<WeatherSnapshotResolution> {
  const reasons: string[] = [];
  const location = parseCoordinates(options.parsedMarket.locationText);
  if (options.parsedMarket.kind === "ambiguous" || options.parsedMarket.ambiguityReasons.length > 0) {
    return { status: "skipped", snapshots: [], sourcesUsed: [], reasons: [...options.parsedMarket.ambiguityReasons] };
  }
  if (!location) {
    return { status: "skipped", snapshots: [], sourcesUsed: [], reasons: ["Location text could not be converted to coordinates."] };
  }

  const snapshots: WeatherSnapshot[] = [];
  const sourcesUsed: WeatherSourceName[] = [];
  for (const source of options.registry.forLocation(location)) {
    try {
      const snapshot = await source.getSnapshot(location);
      snapshots.push(snapshot);
      sourcesUsed.push(source.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown weather source error.";
      reasons.push(`${source.name} failed: ${message}`);
      options.logger.warn("Weather source snapshot fetch failed", { marketId: options.parsedMarket.marketId, source: source.name, message });
    }
  }

  if (snapshots.length === 0) {
    return { status: "failed", snapshots: [], sourcesUsed, reasons: reasons.length ? reasons : ["No weather sources returned snapshots."] };
  }

  const consensus = assessSourceConsensus(snapshots);
  reasons.push(...consensus.disagreements);
  reasons.push(...consensus.staleSources.map((entry) => `${entry.source} stale weather data`));
  return { status: "resolved", snapshots: consensus.usableSnapshots, sourcesUsed, reasons };
}

function parseCoordinates(locationText: string | null): Coordinates | null {
  if (!locationText) return null;
  const latLon = locationText.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (latLon) {
    return { latitude: Number(latLon[1]), longitude: Number(latLon[2]) };
  }

  const key = locationText.toLowerCase().trim();
  const table: Record<string, Coordinates> = {
    seattle: { latitude: 47.6062, longitude: -122.3321 },
    miami: { latitude: 25.7617, longitude: -80.1918 },
    boston: { latitude: 42.3601, longitude: -71.0589 },
    "new york city": { latitude: 40.7128, longitude: -74.006 },
  };
  return table[key] ?? null;
}
