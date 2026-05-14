import type { TradingDecision } from "./decisionEngine.js";

export interface PaperBrokerStore {
  saveTradingDecision(decision: TradingDecision): void;
}

export interface PaperBrokerResult {
  saved: boolean;
  action: TradingDecision["action"];
  marketId: string;
  reason: string;
}

export class PaperBroker {
  constructor(private readonly store: PaperBrokerStore) {}

  recordDecision(decision: TradingDecision): PaperBrokerResult {
    if (!decision.reason.trim()) {
      throw new Error("Every trading decision must include a reason.");
    }

    this.store.saveTradingDecision(decision);
    return {
      saved: true,
      action: decision.action,
      marketId: decision.marketId,
      reason: decision.reason,
    };
  }
}
