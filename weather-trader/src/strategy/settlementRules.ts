import type { ParsedWeatherMarket } from "./marketParser.js";

export interface SettlementRule {
  marketId: string;
  condition: string;
  canEvaluate: boolean;
  blockingReasons: string[];
}

export function buildSettlementRule(parsed: ParsedWeatherMarket): SettlementRule {
  const blockingReasons = [...parsed.ambiguityReasons];

  if (parsed.kind === "ambiguous") {
    blockingReasons.push("Parsed market is ambiguous.");
  }

  if (!parsed.operator && parsed.threshold !== null) {
    blockingReasons.push("Market threshold has no supported comparison operator.");
  }

  return {
    marketId: parsed.marketId,
    condition: describeCondition(parsed),
    canEvaluate: blockingReasons.length === 0,
    blockingReasons: dedupe(blockingReasons),
  };
}

function describeCondition(parsed: ParsedWeatherMarket): string {
  if (parsed.kind === "temperature") {
    return `Temperature ${parsed.operator ?? "?"} ${parsed.threshold ?? "?"}${parsed.unit ?? ""} in ${parsed.locationText ?? "unknown location"} ${parsed.targetDateText ?? "unknown time"}`;
  }

  if (parsed.kind === "rain" || parsed.kind === "snow") {
    if (parsed.threshold !== null) {
      return `${parsed.kind} ${parsed.operator ?? "?"} ${parsed.threshold}${parsed.unit ?? ""} in ${parsed.locationText ?? "unknown location"} ${parsed.targetDateText ?? "unknown time"}`;
    }

    return `${parsed.kind} occurrence in ${parsed.locationText ?? "unknown location"} ${parsed.targetDateText ?? "unknown time"}`;
  }

  return "Unsupported or ambiguous weather settlement condition.";
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
