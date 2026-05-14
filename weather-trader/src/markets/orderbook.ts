export interface OrderbookLevel {
  price: string;
  size: string;
}

export interface PublicOrderbook {
  market: string;
  asset_id: string;
  timestamp: string;
  hash: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  min_order_size?: string;
  tick_size?: string;
  neg_risk?: boolean;
  last_trade_price?: string;
}

export interface OrderbookClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export class OrderbookClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errorCause?: unknown,
  ) {
    super(message);
    this.name = "OrderbookClientError";
  }
}

export class OrderbookClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OrderbookClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getBook(tokenId: string): Promise<PublicOrderbook> {
    const url = new URL("/book", this.options.baseUrl);
    url.searchParams.set("token_id", tokenId);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw new OrderbookClientError("Failed to reach Polymarket public orderbook endpoint.", undefined, error);
    }

    if (!response.ok) {
      throw new OrderbookClientError(
        `Polymarket public orderbook endpoint returned HTTP ${response.status}.`,
        response.status,
      );
    }

    const payload: unknown = await response.json();
    if (!isPublicOrderbook(payload)) {
      throw new OrderbookClientError("Polymarket public orderbook endpoint returned an unexpected payload.");
    }

    return payload;
  }
}

function isPublicOrderbook(value: unknown): value is PublicOrderbook {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const book = value as Partial<PublicOrderbook>;
  return (
    typeof book.market === "string" &&
    typeof book.asset_id === "string" &&
    typeof book.timestamp === "string" &&
    typeof book.hash === "string" &&
    Array.isArray(book.bids) &&
    Array.isArray(book.asks)
  );
}
