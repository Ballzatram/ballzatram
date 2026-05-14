import test from "node:test";
import assert from "node:assert/strict";
import { NwsClient, normalizeNwsForecastPeriod, normalizeNwsObservation } from "./weather/nwsClient.js";
import { normalizeOpenMeteoForecast } from "./weather/openMeteoClient.js";
import { createWeatherSourceRegistry, isLikelyUnitedStates } from "./weather/sourceRegistry.js";
import { assessSourceConsensus } from "./weather/sourceConsensus.js";
import { isWeatherSnapshotStale, type WeatherDataSource, type WeatherSnapshot } from "./weather/types.js";

const location = { latitude: 40.7128, longitude: -74.006 };

test("NWS forecast periods normalize into WeatherSnapshot objects", () => {
  const snapshot = normalizeNwsForecastPeriod(
    {
      startTime: "2026-05-14T18:00:00-04:00",
      temperature: 68,
      temperatureUnit: "F",
      probabilityOfPrecipitation: { value: 40 },
      windSpeed: "10 to 20 mph",
      windDirection: "SW",
      shortForecast: "Chance Rain Showers",
    },
    location,
    "2026-05-14T17:00:00Z",
    "2026-05-14T17:05:00Z",
  );

  assert.equal(snapshot.source, "nws");
  assert.equal(snapshot.isForecast, true);
  assert.equal(snapshot.temperatureC, 20);
  assert.equal(snapshot.precipitationProbabilityPercent, 40);
  assert.equal(snapshot.windSpeedKph, 24.14);
  assert.equal(snapshot.windDirectionDeg, 225);
  assert.equal(snapshot.shortForecast, "Chance Rain Showers");
});

test("NWS client sends configured User-Agent header", async () => {
  const requestedHeaders: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = input.toString();
    requestedHeaders.push(new Headers(init?.headers).get("user-agent") ?? "");

    if (url.includes("/points/")) {
      return new Response(
        JSON.stringify({ properties: { forecastHourly: "https://api.weather.test/gridpoints/OKX/1,2/forecast/hourly" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        properties: {
          generatedAt: "2026-05-14T17:00:00Z",
          periods: [{ startTime: "2026-05-14T18:00:00Z", temperature: 70, temperatureUnit: "F" }],
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const client = new NwsClient({
    baseUrl: "https://api.weather.test",
    userAgent: "weather-trader-test/0.1 (test@example.com)",
    timeoutMs: 1000,
    fetchImpl,
  });

  await client.getForecastSnapshot(location);
  assert.deepEqual(requestedHeaders, [
    "weather-trader-test/0.1 (test@example.com)",
    "weather-trader-test/0.1 (test@example.com)",
  ]);
});

test("NWS observations normalize metric values into WeatherSnapshot objects", () => {
  const snapshot = normalizeNwsObservation(
    {
      properties: {
        timestamp: "2026-05-14T17:00:00Z",
        textDescription: "Light Rain",
        temperature: { value: 12.5, unitCode: "wmoUnit:degC" },
        windSpeed: { value: 5, unitCode: "wmoUnit:m_s-1" },
        windDirection: { value: 180 },
        precipitationLastHour: { value: 0.004, unitCode: "wmoUnit:m" },
      },
    },
    location,
    "2026-05-14T17:05:00Z",
  );

  assert.equal(snapshot.source, "nws");
  assert.equal(snapshot.isForecast, false);
  assert.equal(snapshot.temperatureC, 12.5);
  assert.equal(snapshot.windSpeedKph, 18);
  assert.equal(snapshot.windDirectionDeg, 180);
  assert.equal(snapshot.precipitationMm, 4);
});

test("Open-Meteo forecasts normalize into WeatherSnapshot objects", () => {
  const snapshot = normalizeOpenMeteoForecast(
    {
      current: {
        time: "2026-05-14T17:00",
        temperature_2m: 21.4,
        precipitation: 0.2,
        wind_speed_10m: 11.8,
        wind_direction_10m: 270,
        weather_code: 61,
      },
      hourly: {
        time: ["2026-05-14T17:00"],
        precipitation_probability: [55],
      },
    },
    location,
    "2026-05-14T17:05:00Z",
  );

  assert.equal(snapshot.source, "open-meteo");
  assert.equal(snapshot.temperatureC, 21.4);
  assert.equal(snapshot.precipitationProbabilityPercent, 55);
  assert.equal(snapshot.precipitationMm, 0.2);
  assert.equal(snapshot.windSpeedKph, 11.8);
  assert.equal(snapshot.shortForecast, "Slight rain");
  assert.equal(snapshot.forecastValidAt, "2026-05-14T17:00:00Z");
});

test("stale weather snapshots are detected", () => {
  const snapshot = makeSnapshot("nws", "2026-05-14T15:00:00Z", 20, 20, 10);
  const freshness = isWeatherSnapshotStale(snapshot, new Date("2026-05-14T17:30:00Z"), 60 * 60 * 1000);

  assert.equal(freshness.stale, true);
  assert.equal(freshness.referenceTime, "2026-05-14T15:00:00Z");
});

test("source disagreement produces a confidence haircut", () => {
  const result = assessSourceConsensus(
    [
      makeSnapshot("nws", "2026-05-14T17:00:00Z", 20, 20, 10),
      makeSnapshot("open-meteo", "2026-05-14T17:00:00Z", 28, 80, 40),
    ],
    {
      now: new Date("2026-05-14T17:10:00Z"),
      temperatureDisagreementC: 4,
      precipitationProbabilityDisagreementPercent: 30,
      windSpeedDisagreementKph: 20,
      disagreementHaircut: 0.2,
    },
  );

  assert.deepEqual(result.staleSources, []);
  assert.equal(result.disagreements.length, 3);
  assert.equal(result.confidenceMultiplier, 0.4);
});

test("source registry prefers NWS only for likely U.S. locations and keeps Open-Meteo global", () => {
  const nwsSource = source("nws");
  const openMeteoSource = source("open-meteo");
  const registry = createWeatherSourceRegistry([nwsSource, openMeteoSource]);

  assert.equal(isLikelyUnitedStates(location), true);
  assert.deepEqual(registry.forLocation(location).map((entry) => entry.name), ["nws", "open-meteo"]);
  assert.deepEqual(registry.forLocation({ latitude: 51.5072, longitude: -0.1276 }).map((entry) => entry.name), [
    "open-meteo",
  ]);
});

function makeSnapshot(
  source: WeatherSnapshot["source"],
  forecastValidAt: string,
  temperatureC: number,
  precipitationProbabilityPercent: number,
  windSpeedKph: number,
): WeatherSnapshot {
  return {
    source,
    location,
    observedAt: forecastValidAt,
    fetchedAt: "2026-05-14T17:00:00Z",
    forecastValidAt,
    isForecast: true,
    temperatureC,
    precipitationProbabilityPercent,
    precipitationMm: null,
    windSpeedKph,
    windDirectionDeg: null,
    shortForecast: null,
    raw: {},
  };
}

function source(name: WeatherSnapshot["source"]): WeatherDataSource {
  return {
    name,
    getSnapshot: async () => makeSnapshot(name, "2026-05-14T17:00:00Z", 20, 10, 5),
  };
}
