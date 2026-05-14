import {
  fahrenheitToCelsius,
  metersPerSecondToKph,
  mphToKph,
  type Coordinates,
  type WeatherDataSource,
  type WeatherSnapshot,
} from "./types.js";

export interface NwsClientOptions {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

interface NwsPointResponse {
  properties?: {
    forecastHourly?: string;
    observationStations?: string;
  };
}

interface NwsForecastPeriod {
  startTime?: string;
  temperature?: number;
  temperatureUnit?: string;
  probabilityOfPrecipitation?: { value?: number | null };
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface NwsHourlyForecastResponse {
  properties?: {
    generatedAt?: string;
    periods?: NwsForecastPeriod[];
  };
}

interface NwsStationsResponse {
  features?: Array<{ properties?: { stationIdentifier?: string } }>;
}

interface NwsObservationResponse {
  properties?: {
    timestamp?: string;
    textDescription?: string;
    temperature?: { value?: number | null; unitCode?: string };
    windSpeed?: { value?: number | null; unitCode?: string };
    windDirection?: { value?: number | null };
    precipitationLastHour?: { value?: number | null; unitCode?: string };
  };
}

export class NwsClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errorCause?: unknown,
  ) {
    super(message);
    this.name = "NwsClientError";
  }
}

export class NwsClient implements WeatherDataSource {
  readonly name = "nws" as const;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: NwsClientOptions) {
    if (!options.userAgent.trim()) {
      throw new NwsClientError("NWS requires a configured User-Agent.");
    }

    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getSnapshot(location: Coordinates): Promise<WeatherSnapshot> {
    return this.getForecastSnapshot(location);
  }

  async getForecastSnapshot(location: Coordinates): Promise<WeatherSnapshot> {
    const point = await this.getJson<NwsPointResponse>(`/points/${formatCoordinate(location.latitude)},${formatCoordinate(location.longitude)}`);
    const forecastHourly = point.properties?.forecastHourly;
    if (!forecastHourly) {
      throw new NwsClientError("NWS point response did not include an hourly forecast URL.");
    }

    const forecast = await this.getJson<NwsHourlyForecastResponse>(forecastHourly);
    const period = forecast.properties?.periods?.[0];
    if (!period) {
      throw new NwsClientError("NWS hourly forecast response did not include forecast periods.");
    }

    return normalizeNwsForecastPeriod(period, location, forecast.properties?.generatedAt);
  }

  async getLatestObservationSnapshot(location: Coordinates): Promise<WeatherSnapshot> {
    const point = await this.getJson<NwsPointResponse>(`/points/${formatCoordinate(location.latitude)},${formatCoordinate(location.longitude)}`);
    const observationStations = point.properties?.observationStations;
    if (!observationStations) {
      throw new NwsClientError("NWS point response did not include observation stations.");
    }

    const stations = await this.getJson<NwsStationsResponse>(observationStations);
    const stationId = stations.features?.[0]?.properties?.stationIdentifier;
    if (!stationId) {
      throw new NwsClientError("NWS observation stations response did not include a station identifier.");
    }

    const observation = await this.getJson<NwsObservationResponse>(`/stations/${stationId}/observations/latest`);
    return normalizeNwsObservation(observation, location);
  }

  private async getJson<T>(pathOrUrl: string): Promise<T> {
    const url = new URL(pathOrUrl, this.options.baseUrl);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "application/geo+json, application/json",
          "user-agent": this.options.userAgent,
        },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw new NwsClientError("Failed to reach NWS weather endpoint.", undefined, error);
    }

    if (!response.ok) {
      throw new NwsClientError(`NWS weather endpoint returned HTTP ${response.status}.`, response.status);
    }

    return (await response.json()) as T;
  }
}

export function normalizeNwsForecastPeriod(
  period: NwsForecastPeriod,
  location: Coordinates,
  generatedAt?: string,
  fetchedAt = new Date().toISOString(),
): WeatherSnapshot {
  const temperatureC =
    typeof period.temperature === "number"
      ? period.temperatureUnit === "F"
        ? fahrenheitToCelsius(period.temperature)
        : period.temperature
      : null;

  return {
    source: "nws",
    location,
    observedAt: generatedAt ?? fetchedAt,
    fetchedAt,
    forecastValidAt: period.startTime ?? generatedAt ?? fetchedAt,
    isForecast: true,
    temperatureC,
    precipitationProbabilityPercent: period.probabilityOfPrecipitation?.value ?? null,
    precipitationMm: null,
    windSpeedKph: parseNwsWindSpeedKph(period.windSpeed),
    windDirectionDeg: parseWindDirectionDeg(period.windDirection),
    shortForecast: period.shortForecast ?? null,
    raw: period,
  };
}

export function normalizeNwsObservation(
  observation: NwsObservationResponse,
  location: Coordinates,
  fetchedAt = new Date().toISOString(),
): WeatherSnapshot {
  const properties = observation.properties ?? {};
  return {
    source: "nws",
    location,
    observedAt: properties.timestamp ?? fetchedAt,
    fetchedAt,
    isForecast: false,
    temperatureC: normalizeNwsMetricTemperature(properties.temperature?.value ?? null, properties.temperature?.unitCode),
    precipitationProbabilityPercent: null,
    precipitationMm: normalizeNwsMetricPrecipitation(properties.precipitationLastHour?.value ?? null, properties.precipitationLastHour?.unitCode),
    windSpeedKph: normalizeNwsMetricWindSpeed(properties.windSpeed?.value ?? null, properties.windSpeed?.unitCode),
    windDirectionDeg: properties.windDirection?.value ?? null,
    shortForecast: properties.textDescription ?? null,
    raw: observation,
  };
}

function normalizeNwsMetricTemperature(value: number | null, unitCode?: string): number | null {
  if (value === null) {
    return null;
  }

  if (unitCode?.endsWith("degC")) {
    return value;
  }

  if (unitCode?.endsWith("degF")) {
    return fahrenheitToCelsius(value);
  }

  return value;
}

function normalizeNwsMetricPrecipitation(value: number | null, unitCode?: string): number | null {
  if (value === null) {
    return null;
  }

  if (unitCode?.endsWith("m")) {
    return value * 1000;
  }

  return value;
}

function normalizeNwsMetricWindSpeed(value: number | null, unitCode?: string): number | null {
  if (value === null) {
    return null;
  }

  if (unitCode?.endsWith("m_s-1")) {
    return metersPerSecondToKph(value);
  }

  return value;
}

export function parseNwsWindSpeedKph(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const numbers = [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  if (numbers.length === 0) {
    return null;
  }

  const averageMph = numbers.reduce((sum, current) => sum + current, 0) / numbers.length;
  return mphToKph(averageMph);
}

export function parseWindDirectionDeg(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const cardinalToDeg: Record<string, number> = {
    N: 0,
    NNE: 23,
    NE: 45,
    ENE: 68,
    E: 90,
    ESE: 113,
    SE: 135,
    SSE: 158,
    S: 180,
    SSW: 203,
    SW: 225,
    WSW: 248,
    W: 270,
    WNW: 293,
    NW: 315,
    NNW: 338,
  };

  const normalized = value.trim().toUpperCase();
  return cardinalToDeg[normalized] ?? null;
}

function formatCoordinate(value: number): string {
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
