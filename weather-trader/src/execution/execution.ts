import type { AppConfig } from "../config/config.js";
import type { TradingDecision } from "../strategy/decisionEngine.js";
import type { ClobClient, ClobOrderResponse, SignedLimitOrderPayload } from "./clobClient.js";

export interface LimitOrderIntent {
  decision: TradingDecision;
  tokenId: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  orderType: "GTC" | "GTD";
}

export interface LiveBroker {
  placeLimitOrder(intent: LimitOrderIntent, signedOrder: SignedLimitOrderPayload["signedOrder"]): Promise<ClobOrderResponse>;
}

export class LiveExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveExecutionError";
  }
}

export class LockedLiveBroker implements LiveBroker {
  constructor(
    private readonly config: AppConfig,
    private readonly clobClient: ClobClient,
  ) {}

  async placeLimitOrder(intent: LimitOrderIntent, signedOrder: SignedLimitOrderPayload["signedOrder"]): Promise<ClobOrderResponse> {
    assertLiveExecutionAllowed(this.config, intent);
    return this.clobClient.postSignedLimitOrder({
      orderType: intent.orderType,
      tokenId: intent.tokenId,
      side: intent.side,
      price: intent.price,
      size: intent.size,
      signedOrder,
    });
  }
}

export function assertLiveExecutionAllowed(config: AppConfig, intent: LimitOrderIntent): void {
  if (config.mode !== "live") {
    throw new LiveExecutionError(`Live orders are blocked when WEATHER_TRADER_MODE=${config.mode}.`);
  }

  if (!config.liveTradingEnabled || !config.liveTrading.enabled) {
    throw new LiveExecutionError("Live orders are blocked because LIVE_TRADING_ENABLED is not true.");
  }

  if (config.liveTrading.killSwitch) {
    throw new LiveExecutionError("Live orders are blocked by LIVE_TRADING_KILL_SWITCH.");
  }

  if (intent.decision.action !== "PAPER_TRADE") {
    throw new LiveExecutionError("Live orders require a reviewed PAPER_TRADE decision from the strategy layer.");
  }

  if (intent.orderType !== "GTC" && intent.orderType !== "GTD") {
    throw new LiveExecutionError("Only limit order execution is allowed.");
  }

  if (!intent.tokenId.trim()) {
    throw new LiveExecutionError("Live limit orders require a CLOB token id.");
  }

  if (!Number.isFinite(intent.price) || intent.price <= 0 || intent.price >= 1) {
    throw new LiveExecutionError("Live limit orders require a limit price between 0 and 1.");
  }

  if (!Number.isFinite(intent.size) || intent.size <= 0) {
    throw new LiveExecutionError("Live limit orders require a positive size.");
  }
}
