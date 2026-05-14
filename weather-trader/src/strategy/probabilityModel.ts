import type { WeatherSnapshot } from "../weather/types.js";
import type { ParsedWeatherMarket } from "./marketParser.js";

export interface ProbabilityEstimate {
  probability: number;
  confidence: number;
  reasons: string[];
}

export function estimateWeatherProbability(
  parsed: ParsedWeatherMarket,
  snapshots: WeatherSnapshot[] = [],
): ProbabilityEstimate {
  if (parsed.kind === "ambiguous") {
    return { probability: 0.5, confidence: 0, reasons: ["Cannot estimate probability for an ambiguous market."] };
  }

  const usable = snapshots.filter((snapshot) => snapshot.temperatureC !== null || snapshot.precipitationProbabilityPercent !== null || snapshot.shortForecast !== null);
  if (usable.length === 0) {
    return {
      probability: 0.5,
      confidence: 0.35,
      reasons: ["No weather snapshots available; using neutral prior."],
    };
  }

  if (parsed.kind === "temperature") {
    return estimateTemperatureProbability(parsed, usable);
  }

  return estimatePrecipitationProbability(parsed, usable);
}

function estimateTemperatureProbability(parsed: ParsedWeatherMarket, snapshots: WeatherSnapshot[]): ProbabilityEstimate {
  const temperatures = snapshots
    .map((snapshot) => snapshot.temperatureC)
    .filter((value): value is number => typeof value === "number");

  if (temperatures.length === 0 || parsed.threshold === null || !parsed.operator) {
    return { probability: 0.5, confidence: 0.2, reasons: ["Missing temperature data or threshold; using neutral prior."] };
  }

  const averageC = average(temperatures);
  const thresholdC = parsed.unit === "F" ? (parsed.threshold - 32) * (5 / 9) : parsed.threshold;
  const marginC = averageC - thresholdC;
  const favorsYes = parsed.operator === "above" || parsed.operator === "at_or_above" ? marginC > 0 : marginC < 0;
  const probability = clamp(0.5 + Math.min(Math.abs(marginC) / 20, 0.4) * (favorsYes ? 1 : -1), 0.05, 0.95);

  return {
    probability: roundTo(probability, 3),
    confidence: 0.7,
    reasons: [`Average normalized temperature ${roundTo(averageC, 2)}C versus threshold ${roundTo(thresholdC, 2)}C.`],
  };
}

function estimatePrecipitationProbability(parsed: ParsedWeatherMarket, snapshots: WeatherSnapshot[]): ProbabilityEstimate {
  const probabilities = snapshots
    .map((snapshot) => snapshot.precipitationProbabilityPercent)
    .filter((value): value is number => typeof value === "number");
  const descriptions = snapshots.map((snapshot) => snapshot.shortForecast?.toLowerCase() ?? "").join(" ");

  if (probabilities.length > 0) {
    const averageProbability = average(probabilities) / 100;
    return {
      probability: roundTo(clamp(averageProbability, 0.02, 0.98), 3),
      confidence: 0.65,
      reasons: [`Average precipitation probability is ${roundTo(averageProbability * 100, 1)}%.`],
    };
  }

  const keyword = parsed.kind === "snow" ? "snow" : "rain";
  if (descriptions.includes(keyword)) {
    return { probability: 0.62, confidence: 0.45, reasons: [`Forecast text mentions ${keyword}.`] };
  }

  return { probability: 0.5, confidence: 0.25, reasons: ["Missing precipitation probability; using neutral prior."] };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
