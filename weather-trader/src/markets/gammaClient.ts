export interface GammaMarket {
  id: string;
  question?: string | null;
  conditionId?: string | null;
  slug?: string | null;
  description?: string | null;
  category?: string | null;
  outcomes?: string | string[] | null;
  outcomePrices?: string | string[] | null;
  clobTokenIds?: string | string[] | null;
  active?: boolean | null;
  closed?: boolean | null;
  enableOrderBook?: boolean | null;
  acceptingOrders?: boolean | null;
  endDate?: string | null;
  endDateIso?: string | null;
  volumeNum?: number | null;
  liquidityNum?: number | null;
  bestBid?: number | null;
  bestAsk?: number | null;
  lastTradePrice?: number | null;
  events?: Array<{
    id?: string | null;
    slug?: string | null;
    title?: string | null;
    description?: string | null;
    category?: string | null;
  }>;
  tags?: Array<{
    id?: string | null;
    label?: string | null;
    slug?: string | null;
  }>;
  [key: string]: unknown;
}

export interface GammaClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export interface ListMarketsOptions {
  limit: number;
  offset?: number;
  closed?: boolean;
}

export class GammaClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errorCause?: unknown,
  ) {
    super(message);
    this.name = "GammaClientError";
  }
}

export class GammaClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: GammaClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async listMarkets(options: ListMarketsOptions): Promise<GammaMarket[]> {
    const url = new URL("/markets", this.options.baseUrl);
    url.searchParams.set("limit", options.limit.toString());
    url.searchParams.set("offset", (options.offset ?? 0).toString());
    url.searchParams.set("closed", String(options.closed ?? false));

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw new GammaClientError("Failed to reach Polymarket Gamma markets endpoint.", undefined, error);
    }

    if (!response.ok) {
      throw new GammaClientError(
        `Polymarket Gamma markets endpoint returned HTTP ${response.status}.`,
        response.status,
      );
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new GammaClientError("Polymarket Gamma markets endpoint returned an unexpected payload.");
    }

    return payload.filter(isGammaMarket);
  }
}

function isGammaMarket(value: unknown): value is GammaMarket {
  return typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";
}
