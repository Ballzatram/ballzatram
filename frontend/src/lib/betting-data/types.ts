export const sportIds = ["basketball", "football", "baseball", "hockey", "soccer", "demo"] as const;
export type SportId = (typeof sportIds)[number];

export const bettingMarketTypes = ["moneyline", "spread", "total", "player-prop", "future"] as const;
export type BettingMarketType = (typeof bettingMarketTypes)[number];

export type BettingFreshnessStatus = "live" | "demo" | "stale" | "error" | "unknown";

export type BettingDataFreshness = {
  provider: string;
  source: string;
  status: BettingFreshnessStatus;
  asOf: string;
  retrievedAt: string;
  warnings: string[];
};

export type BettingOutcome = {
  id: string;
  label: string;
  oddsAmerican: number;
  impliedProbability: number;
  decimalOdds: number;
  line?: number;
  note?: string;
};

export type BettingMarket = {
  id: string;
  eventId: string;
  label: string;
  type: BettingMarketType;
  outcomes: BettingOutcome[];
  lastUpdated: string;
  status: "open" | "closed" | "demo";
};

export type BettingEvent = {
  id: string;
  sport: SportId;
  league: string;
  startsAt: string;
  awayTeam: string;
  homeTeam: string;
  neutralSite?: boolean;
  markets: BettingMarket[];
};

export type OddsBoard = {
  sport: SportId;
  marketType: BettingMarketType;
  events: BettingEvent[];
  freshness: BettingDataFreshness;
  sourceLabel: string;
};

export type LineHistoryPoint = {
  at: string;
  oddsAmerican: number;
  line?: number;
};

export type LineHistory = {
  eventId: string;
  marketId: string;
  outcomeId: string;
  points: LineHistoryPoint[];
  freshness: BettingDataFreshness;
};

export type BettingMarketSummary = {
  id: BettingMarketType;
  title: string;
  description: string;
};

export type BettingDataProvider = {
  name: string;
  getOddsBoard: (sport: SportId, marketType: BettingMarketType) => Promise<OddsBoard>;
  getEventOdds: (eventId: string) => Promise<BettingEvent | null>;
  getLineHistory: (eventId: string, marketId: string, outcomeId?: string) => Promise<LineHistory>;
  getMarketsBySport: (sport: SportId) => Promise<BettingMarketSummary[]>;
  getDemoOdds: () => Promise<OddsBoard>;
};
