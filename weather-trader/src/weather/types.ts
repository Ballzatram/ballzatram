export type WeatherSourceName = "nws" | "open-meteo";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface WeatherSnapshot {
  source: WeatherSourceName;
  location: Coordinates;
  observedAt: string;
  fetchedAt: string;
  forecastValidAt?: string;
  isForecast: boolean;
  temperatureC: number | null;
  precipitationProbabilityPercent: number | null;
  precipitationMm: number | null;
  windSpeedKph: number | null;
  windDirectionDeg: number | null;
  shortForecast: string | null;
  raw: unknown;
}

export interface WeatherDataSource {
  readonly name: WeatherSourceName;
  getSnapshot(location: Coordinates): Promise<WeatherSnapshot>;
}

export interface WeatherFreshnessCheck {
  stale: boolean;
  ageMs: number;
  maxAgeMs: number;
  referenceTime: string;
}

export function isWeatherSnapshotStale(
  snapshot: WeatherSnapshot,
  now = new Date(),
  maxAgeMs = 60 * 60 * 1000,
): WeatherFreshnessCheck {
  const referenceTime = snapshot.forecastValidAt ?? snapshot.observedAt;
  const referenceDate = new Date(referenceTime);
  const ageMs = Number.isNaN(referenceDate.getTime()) ? Number.POSITIVE_INFINITY : now.getTime() - referenceDate.getTime();

  return {
    stale: ageMs > maxAgeMs,
    ageMs,
    maxAgeMs,
    referenceTime,
  };
}

export function fahrenheitToCelsius(value: number): number {
  return roundTo(valueToCelsius(value), 2);
}

export function mphToKph(value: number): number {
  return roundTo(value * 1.609344, 2);
}

export function metersPerSecondToKph(value: number): number {
  return roundTo(value * 3.6, 2);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function valueToCelsius(value: number): number {
  return (value - 32) * (5 / 9);
}
