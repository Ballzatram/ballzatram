export { createStatusPayload, type WeatherBotStatus } from "./api/status.js";
export { loadConfig, type AppConfig } from "./config/config.js";
export { parseDotEnv, loadDotEnvFile, type EnvSource } from "./config/env.js";
export { openMarketSnapshotStore, type MarketSnapshotStore } from "./db/marketSnapshotStore.js";
export { SQLITE_SCHEMA } from "./db/schema.js";
export { createLogger, type Logger, type LogLevel } from "./logger/logger.js";
export { BOT_MODES, describeMode, type BotMode } from "./modes/mode.js";
export { GammaClient, GammaClientError, type GammaMarket } from "./markets/gammaClient.js";
export { runMarketDiscovery, isWeatherMarket, type MarketDiscoveryResult } from "./markets/marketDiscovery.js";
export { OrderbookClient, OrderbookClientError, type PublicOrderbook } from "./markets/orderbook.js";
export { createApiServer } from "./server.js";

export { NwsClient, NwsClientError, normalizeNwsForecastPeriod, normalizeNwsObservation } from "./weather/nwsClient.js";
export { OpenMeteoClient, OpenMeteoClientError, normalizeOpenMeteoForecast } from "./weather/openMeteoClient.js";
export { createDefaultWeatherSourceRegistry, createWeatherSourceRegistry, isLikelyUnitedStates } from "./weather/sourceRegistry.js";
export { assessSourceConsensus, type SourceConsensusResult } from "./weather/sourceConsensus.js";
export { isWeatherSnapshotStale, type Coordinates, type WeatherDataSource, type WeatherSnapshot } from "./weather/types.js";
export { decideMarket, type DecisionAction, type TradingDecision } from "./strategy/decisionEngine.js";
export { computeBestEdge, extractMarketPrice, type EdgeEstimate, type MarketPrice, type TradeSide } from "./strategy/edgeModel.js";
export { parseWeatherMarket, type ParsedWeatherMarket, type WeatherMarketKind } from "./strategy/marketParser.js";
export { PaperBroker, type PaperBrokerResult, type PaperBrokerStore } from "./strategy/paperBroker.js";
export { DEFAULT_PAPER_PORTFOLIO, getMarketExposureCents, getOpenExposureCents, type PaperPortfolio } from "./strategy/portfolio.js";
export { estimateWeatherProbability, type ProbabilityEstimate } from "./strategy/probabilityModel.js";
export { buildSettlementRule, type SettlementRule } from "./strategy/settlementRules.js";
export { DEFAULT_RISK_LIMITS, sizePaperTrade, type RiskLimits, type SizingResult } from "./strategy/sizing.js";

export { ClobClient, ClobClientError, assertLimitOrderPayload, type ClobClientOptions, type SignedLimitOrderPayload, type ClobOrderResponse } from "./execution/clobClient.js";
export { LockedLiveBroker, LiveExecutionError, assertLiveExecutionAllowed, type LimitOrderIntent, type LiveBroker } from "./execution/execution.js";
