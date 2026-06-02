import {
  americanOddsToImpliedProbability,
  americanToDecimalOdds,
} from "@/lib/betting-data/analytics";
import type {
  BettingDataFreshness,
  BettingDataProvider,
  BettingEvent,
  BettingMarket,
  BettingMarketSummary,
  BettingMarketType,
  BettingOutcome,
  LineHistory,
  LineHistoryPoint,
  OddsBoard,
  SportId,
} from "@/lib/betting-data/types";

const DEMO_RETRIEVED_AT = "2026-06-02T14:30:00.000Z";

const baseFreshness: BettingDataFreshness = {
  provider: "ballzatram-demo-betting-provider",
  source: "local deterministic demo data",
  status: "demo",
  asOf: "2026-06-02T14:30:00.000Z",
  retrievedAt: DEMO_RETRIEVED_AT,
  warnings: [
    "Demo data shown.",
    "No live sportsbook integration is configured.",
    "Odds can change rapidly and should be rechecked at the source.",
  ],
};

function outcome(id: string, label: string, oddsAmerican: number, line?: number, note?: string): BettingOutcome {
  return {
    id,
    label,
    oddsAmerican,
    impliedProbability: americanOddsToImpliedProbability(oddsAmerican),
    decimalOdds: americanToDecimalOdds(oddsAmerican),
    line,
    note,
  };
}

function market(
  id: string,
  eventId: string,
  label: string,
  type: BettingMarketType,
  outcomes: BettingOutcome[],
): BettingMarket {
  return {
    id,
    eventId,
    label,
    type,
    outcomes,
    lastUpdated: DEMO_RETRIEVED_AT,
    status: "demo",
  };
}

const demoEvents: BettingEvent[] = [
  {
    id: "demo-basketball-harbor-metro",
    sport: "basketball",
    league: "Demo Basketball",
    startsAt: "2026-06-03T23:30:00.000Z",
    awayTeam: "Metro Makers",
    homeTeam: "Harbor Lines",
    markets: [
      market("harbor-metro-moneyline", "demo-basketball-harbor-metro", "Moneyline", "moneyline", [
        outcome("metro-makers", "Metro Makers", 150, undefined, "Example underdog price used for implied-probability education."),
        outcome("harbor-lines", "Harbor Lines", -170, undefined, "Favorite side in the same demo market."),
      ]),
      market("harbor-metro-spread", "demo-basketball-harbor-metro", "Spread", "spread", [
        outcome("metro-makers-plus", "Metro Makers +3.5", -110, 3.5),
        outcome("harbor-lines-minus", "Harbor Lines -3.5", -110, -3.5),
      ]),
      market("harbor-metro-total", "demo-basketball-harbor-metro", "Total 218.5", "total", [
        outcome("over-2185", "Over 218.5", -105, 218.5),
        outcome("under-2185", "Under 218.5", -115, 218.5),
      ]),
    ],
  },
  {
    id: "demo-basketball-capital-river",
    sport: "basketball",
    league: "Demo Basketball",
    startsAt: "2026-06-04T00:00:00.000Z",
    awayTeam: "Capital Foundry",
    homeTeam: "River Terminal",
    markets: [
      market("capital-river-moneyline", "demo-basketball-capital-river", "Moneyline", "moneyline", [
        outcome("capital-foundry", "Capital Foundry", -115),
        outcome("river-terminal", "River Terminal", 105),
      ]),
      market("capital-river-spread", "demo-basketball-capital-river", "Spread", "spread", [
        outcome("capital-foundry-minus", "Capital Foundry -1.5", -108, -1.5),
        outcome("river-terminal-plus", "River Terminal +1.5", -112, 1.5),
      ]),
    ],
  },
  {
    id: "demo-football-grid-foundry",
    sport: "football",
    league: "Demo Football",
    startsAt: "2026-06-06T17:00:00.000Z",
    awayTeam: "West Grid",
    homeTeam: "East Foundry",
    markets: [
      market("grid-foundry-moneyline", "demo-football-grid-foundry", "Moneyline", "moneyline", [
        outcome("west-grid", "West Grid", 135),
        outcome("east-foundry", "East Foundry", -155),
      ]),
      market("grid-foundry-total", "demo-football-grid-foundry", "Total 44.5", "total", [
        outcome("over-445", "Over 44.5", -110, 44.5),
        outcome("under-445", "Under 44.5", -110, 44.5),
      ]),
    ],
  },
];

const lineHistory: Record<string, LineHistoryPoint[]> = {
  "demo-basketball-harbor-metro:harbor-metro-moneyline:metro-makers": [
    { at: "2026-06-02T10:00:00.000Z", oddsAmerican: 165 },
    { at: "2026-06-02T12:00:00.000Z", oddsAmerican: 155 },
    { at: "2026-06-02T14:30:00.000Z", oddsAmerican: 150 },
  ],
  "demo-basketball-harbor-metro:harbor-metro-spread:harbor-lines-minus": [
    { at: "2026-06-02T10:00:00.000Z", oddsAmerican: -110, line: -2.5 },
    { at: "2026-06-02T12:00:00.000Z", oddsAmerican: -112, line: -3 },
    { at: "2026-06-02T14:30:00.000Z", oddsAmerican: -110, line: -3.5 },
  ],
};

const marketSummaries: BettingMarketSummary[] = [
  {
    id: "moneyline",
    title: "Moneyline",
    description: "A straight price on which side wins the event.",
  },
  {
    id: "spread",
    title: "Spread",
    description: "A market that adds or subtracts points to frame a margin question.",
  },
  {
    id: "total",
    title: "Total",
    description: "A market around whether combined scoring finishes over or under a number.",
  },
  {
    id: "player-prop",
    title: "Player prop",
    description: "A player-specific market that usually needs extra injury, role, and minutes context.",
  },
  {
    id: "future",
    title: "Future",
    description: "A longer-horizon market where time, hold, and liquidity can be especially important.",
  },
];

function boardFor(sport: SportId, marketType: BettingMarketType): OddsBoard {
  const events = demoEvents
    .filter((event) => event.sport === sport)
    .map((event) => ({
      ...event,
      markets: event.markets.filter((item) => item.type === marketType),
    }))
    .filter((event) => event.markets.length > 0);

  return {
    sport,
    marketType,
    events,
    freshness: events.length
      ? baseFreshness
      : {
          ...baseFreshness,
          warnings: [...baseFreshness.warnings, "No demo events are available for this sport and market type."],
        },
    sourceLabel: "Bettor's Corner demo odds board",
  };
}

export const demoBettingDataProvider: BettingDataProvider = {
  name: "ballzatram-demo-betting-provider",
  async getOddsBoard(sport, marketType) {
    return boardFor(sport, marketType);
  },
  async getEventOdds(eventId) {
    return demoEvents.find((event) => event.id === eventId) ?? null;
  },
  async getLineHistory(eventId, marketId, outcomeId = "metro-makers") {
    const key = `${eventId}:${marketId}:${outcomeId}`;
    return {
      eventId,
      marketId,
      outcomeId,
      points: lineHistory[key] ?? [],
      freshness: lineHistory[key]
        ? baseFreshness
        : {
            ...baseFreshness,
            warnings: [...baseFreshness.warnings, "No demo line history is available for this market."],
          },
    };
  },
  async getMarketsBySport() {
    return marketSummaries;
  },
  async getDemoOdds() {
    return boardFor("basketball", "moneyline");
  },
};

export function getDemoBettingEvents(): BettingEvent[] {
  return demoEvents;
}
