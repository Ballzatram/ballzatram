export interface ClobClientOptions {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export interface SignedLimitOrderPayload {
  orderType: "GTC" | "GTD";
  tokenId: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  signedOrder: unknown;
}

export interface ClobOrderResponse {
  orderId?: string;
  status?: string;
  raw: unknown;
}

export class ClobClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errorCause?: unknown,
  ) {
    super(message);
    this.name = "ClobClientError";
  }
}

export class ClobClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClobClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async postSignedLimitOrder(payload: SignedLimitOrderPayload): Promise<ClobOrderResponse> {
    assertLimitOrderPayload(payload);

    const url = new URL("/order", this.options.baseUrl);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          POLY_API_KEY: this.options.apiKey,
          POLY_SECRET: this.options.apiSecret,
          POLY_PASSPHRASE: this.options.apiPassphrase,
        },
        body: JSON.stringify(payload.signedOrder),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw new ClobClientError("Failed to reach Polymarket CLOB order endpoint.", undefined, error);
    }

    if (!response.ok) {
      throw new ClobClientError(`Polymarket CLOB order endpoint returned HTTP ${response.status}.`, response.status);
    }

    const raw: unknown = await response.json();
    return normalizeOrderResponse(raw);
  }
}

export function assertLimitOrderPayload(payload: SignedLimitOrderPayload): void {
  if (payload.orderType !== "GTC" && payload.orderType !== "GTD") {
    throw new ClobClientError("Only limit order types GTC and GTD are allowed by the live skeleton.");
  }

  if (!payload.tokenId.trim()) {
    throw new ClobClientError("Limit order tokenId is required.");
  }

  if (payload.side !== "BUY" && payload.side !== "SELL") {
    throw new ClobClientError("Limit order side must be BUY or SELL.");
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0 || payload.price >= 1) {
    throw new ClobClientError("Limit order price must be a probability between 0 and 1.");
  }

  if (!Number.isFinite(payload.size) || payload.size <= 0) {
    throw new ClobClientError("Limit order size must be positive.");
  }
}

function normalizeOrderResponse(raw: unknown): ClobOrderResponse {
  if (typeof raw === "object" && raw !== null) {
    const record = raw as { orderID?: unknown; orderId?: unknown; status?: unknown };
    return {
      orderId: typeof record.orderId === "string" ? record.orderId : typeof record.orderID === "string" ? record.orderID : undefined,
      status: typeof record.status === "string" ? record.status : undefined,
      raw,
    };
  }

  return { raw };
}
