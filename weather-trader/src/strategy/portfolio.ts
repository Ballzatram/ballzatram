export interface PortfolioPosition {
  marketId: string;
  side: "yes" | "no";
  stakeCents: number;
}

export interface PaperPortfolio {
  cashCents: number;
  positions: PortfolioPosition[];
}

export const DEFAULT_PAPER_PORTFOLIO: PaperPortfolio = {
  cashCents: 100_000,
  positions: [],
};

export function getOpenExposureCents(portfolio: PaperPortfolio): number {
  return portfolio.positions.reduce((sum, position) => sum + position.stakeCents, 0);
}

export function getMarketExposureCents(portfolio: PaperPortfolio, marketId: string): number {
  return portfolio.positions
    .filter((position) => position.marketId === marketId)
    .reduce((sum, position) => sum + position.stakeCents, 0);
}
