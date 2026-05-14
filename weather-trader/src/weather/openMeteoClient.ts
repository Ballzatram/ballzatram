import type { Coordinates, WeatherDataSource, WeatherSnapshot } from "./types.js";

export interface OpenMeteoClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

interface OpenMeteoForecastResponse {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
  };
  [key: string]: unknown;
}

export class OpenMeteoClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errorCause?: unknown,
  ) {
    super(message);
    this.name = "OpenMeteoClientError";
  }
}

export class OpenMeteoClient implements WeatherDataSource {
  readonly name = "open-meteo" as const;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenMeteoClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getSnapshot(location: Coordinates): Promise<WeatherSnapshot> {
    const url = new URL("/v1/forecast", this.options.baseUrl);
    url.searchParams.set("latitude", location.latitude.toString());
    url.searchParams.set("longitude", location.longitude.toString());
    url.searchParams.set("current", "temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,weather_code");
    url.searchParams.set(
      "hourly",
      "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m",
    );
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("timezone", "UTC");

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw new OpenMeteoClientError("Failed to reach Open-Meteo forecast endpoint.", undefined, error);
    }

    if (!response.ok) {
      throw new OpenMeteoClientError(`Open-Meteo forecast endpoint returned HTTP ${response.status}.`, response.status);
    }

    return normalizeOpenMeteoForecast((await response.json()) as OpenMeteoForecastResponse, location);
  }
}

export function normalizeOpenMeteoForecast(
  payload: OpenMeteoForecastResponse,
  location: Coordinates,
  fetchedAt = new Date().toISOString(),
): WeatherSnapshot {
  const currentTime = payload.current?.time;
  const hourlyIndex = findHourlyIndex(payload.hourly?.time, currentTime);

  return {
    source: "open-meteo",
    location,
    observedAt: currentTime ? toIsoTimestamp(currentTime) : fetchedAt,
    fetchedAt,
    forecastValidAt: currentTime ? toIsoTimestamp(currentTime) : fetchedAt,
    isForecast: true,
    temperatureC: payload.current?.temperature_2m ?? readHourlyValue(payload.hourly?.temperature_2m, hourlyIndex),
    precipitationProbabilityPercent: readHourlyValue(payload.hourly?.precipitation_probability, hourlyIndex),
    precipitationMm: payload.current?.precipitation ?? readHourlyValue(payload.hourly?.precipitation, hourlyIndex),
    windSpeedKph: payload.current?.wind_speed_10m ?? readHourlyValue(payload.hourly?.wind_speed_10m, hourlyIndex),
    windDirectionDeg: payload.current?.wind_direction_10m ?? readHourlyValue(payload.hourly?.wind_direction_10m, hourlyIndex),
    shortForecast: describeOpenMeteoWeatherCode(payload.current?.weather_code),
    raw: payload,
  };
}

function findHourlyIndex(times: string[] | undefined, currentTime: string | undefined): number {
  if (!times || !currentTime) {
    return 0;
  }

  const index = times.indexOf(currentTime);
  return index >= 0 ? index : 0;
}

function readHourlyValue(values: number[] | undefined, index: number): number | null {
  return values?.[index] ?? null;
}

function toIsoTimestamp(value: string): string {
  return value.endsWith("Z") ? value : `${value}:00Z`;
}

export function describeOpenMeteoWeatherCode(code: number | undefined): string | null {
  if (typeof code !== "number") {
    return null;
  }

  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
  };

  return descriptions[code] ?? `Weather code ${code}`;
}
