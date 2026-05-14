import type { GammaMarket } from "../markets/gammaClient.js";

export type WeatherMarketKind = "temperature" | "rain" | "snow" | "ambiguous";
export type ThresholdOperator = "above" | "below" | "at_or_above" | "at_or_below";

export interface ParsedWeatherMarket {
  marketId: string;
  question: string;
  kind: WeatherMarketKind;
  operator: ThresholdOperator | null;
  threshold: number | null;
  unit: "F" | "C" | "in" | "mm" | null;
  locationText: string | null;
  targetDateText: string | null;
  ambiguityReasons: string[];
}

export function parseWeatherMarket(market: Pick<GammaMarket, "id" | "question" | "slug" | "description">): ParsedWeatherMarket {
  const question = market.question ?? market.slug ?? market.description ?? "";
  const normalized = question.toLowerCase();
  const ambiguityReasons: string[] = [];
  const kind = inferKind(normalized);
  const threshold = parseThreshold(normalized, kind);
  const operator = parseOperator(normalized);
  const locationText = parseLocationText(question);
  const targetDateText = parseTargetDateText(question);

  if (question.trim().length === 0) {
    ambiguityReasons.push("Market has no question text to parse.");
  }

  if (kind === "ambiguous") {
    ambiguityReasons.push("Market question does not contain a supported weather condition.");
  }

  if (kind === "temperature" && threshold.value === null) {
    ambiguityReasons.push("Temperature market does not include a numeric threshold.");
  }

  if ((kind === "rain" || kind === "snow") && normalized.includes("how much") && threshold.value === null) {
    ambiguityReasons.push("Precipitation amount market is missing a numeric threshold.");
  }

  if (!locationText) {
    ambiguityReasons.push("Market location could not be inferred from the question.");
  }

  if (!targetDateText) {
    ambiguityReasons.push("Market target date/time could not be inferred from the question.");
  }

  return {
    marketId: market.id,
    question,
    kind: ambiguityReasons.length > 0 ? "ambiguous" : kind,
    operator,
    threshold: threshold.value,
    unit: threshold.unit,
    locationText,
    targetDateText,
    ambiguityReasons,
  };
}

function inferKind(normalized: string): WeatherMarketKind {
  if (/\b(temp|temperature|degrees|fahrenheit|celsius)\b/.test(normalized)) {
    return "temperature";
  }

  if (/\b(rain|raining|rainfall|precipitation|showers)\b/.test(normalized)) {
    return "rain";
  }

  if (/\b(snow|snowfall|snowing)\b/.test(normalized)) {
    return "snow";
  }

  return "ambiguous";
}

function parseOperator(normalized: string): ThresholdOperator | null {
  if (/\b(at least|or more|>=|at or above)\b/.test(normalized)) {
    return "at_or_above";
  }

  if (/\b(at most|or less|<=|at or below)\b/.test(normalized)) {
    return "at_or_below";
  }

  if (/\b(above|over|greater than|exceed|exceeds|higher than)\b/.test(normalized)) {
    return "above";
  }

  if (/\b(below|under|less than|lower than)\b/.test(normalized)) {
    return "below";
  }

  return null;
}

function parseThreshold(normalized: string, kind: WeatherMarketKind): { value: number | null; unit: ParsedWeatherMarket["unit"] } {
  const numberMatch = normalized.match(/(-?\d+(?:\.\d+)?)/);
  if (!numberMatch) {
    return { value: null, unit: null };
  }

  const value = Number(numberMatch[1]);
  if (kind === "temperature") {
    const unit = /\b(c|celsius)\b/.test(normalized) ? "C" : "F";
    return { value, unit };
  }

  if (kind === "rain" || kind === "snow") {
    const unit = /\b(mm|millimeters?)\b/.test(normalized) ? "mm" : "in";
    return { value, unit };
  }

  return { value, unit: null };
}

function parseLocationText(question: string): string | null {
  const patterns = [
    /\bin\s+([^?]+?)\s+(?:on|by|before|after|today|tomorrow|this|next|during|at)\b/i,
    /\bfor\s+([^?]+?)\s+(?:on|by|before|after|today|tomorrow|this|next|during|at)\b/i,
    /\bat\s+([^?]+?)\s+(?:on|by|before|after|today|tomorrow|this|next|during)\b/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match?.[1]) {
      return cleanupPhrase(match[1]);
    }
  }

  return null;
}

function parseTargetDateText(question: string): string | null {
  const match = question.match(/\b(today|tomorrow|this\s+week|this\s+month|next\s+week|by\s+[^?]+|on\s+[^?]+)\??$/i);
  return match?.[1] ? cleanupPhrase(match[1]) : null;
}

function cleanupPhrase(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[?.!,]+$/g, "").trim();
}
