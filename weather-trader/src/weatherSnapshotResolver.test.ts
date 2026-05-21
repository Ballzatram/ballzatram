import test from "node:test";
import assert from "node:assert/strict";
import { createLogger } from "./logger/logger.js";
import { resolveWeatherSnapshots } from "./weather/weatherSnapshotResolver.js";
import { createWeatherSourceRegistry } from "./weather/sourceRegistry.js";
import type { WeatherDataSource } from "./weather/types.js";

const logger = createLogger("error");

test("ambiguous market skips fetch", async () => {
  const res = await resolveWeatherSnapshots({
    parsedMarket: { marketId: "m1", question: "", kind: "ambiguous", operator: null, threshold: null, unit: null, locationText: null, targetDateText: null, ambiguityReasons: ["amb"] },
    registry: createWeatherSourceRegistry([]),
    logger,
  });
  assert.equal(res.status, "skipped");
  assert.equal(res.snapshots.length, 0);
});

test("NWS success returns snapshots", async () => {
  const nws: WeatherDataSource = { name: "nws", getSnapshot: async () => ({ source:"nws", location:{latitude:47.6062,longitude:-122.3321}, observedAt:new Date().toISOString(), fetchedAt:new Date().toISOString(), isForecast:true, temperatureC:10, precipitationProbabilityPercent:40, precipitationMm:null, windSpeedKph:10, windDirectionDeg:null, shortForecast:null, raw:{} }) };
  const res = await resolveWeatherSnapshots({ parsedMarket: { marketId:"m2", question:"", kind:"rain", operator:null, threshold:null, unit:null, locationText:"Seattle", targetDateText:"tomorrow", ambiguityReasons:[] }, registry:createWeatherSourceRegistry([nws]), logger });
  assert.equal(res.status, "resolved");
  assert.equal(res.snapshots.length, 1);
});

test("NWS failure falls back to Open-Meteo", async () => {
  const nws: WeatherDataSource = { name: "nws", getSnapshot: async () => { throw new Error("down"); } };
  const om: WeatherDataSource = { name: "open-meteo", getSnapshot: async () => ({ source:"open-meteo", location:{latitude:47.6062,longitude:-122.3321}, observedAt:new Date().toISOString(), fetchedAt:new Date().toISOString(), isForecast:true, temperatureC:9, precipitationProbabilityPercent:50, precipitationMm:null, windSpeedKph:12, windDirectionDeg:null, shortForecast:null, raw:{} }) };
  const res = await resolveWeatherSnapshots({ parsedMarket: { marketId:"m3", question:"", kind:"rain", operator:null, threshold:null, unit:null, locationText:"Seattle", targetDateText:"tomorrow", ambiguityReasons:[] }, registry:createWeatherSourceRegistry([nws,om]), logger });
  assert.equal(res.status, "resolved");
  assert.deepEqual(res.sourcesUsed, ["open-meteo"]);
});

test("all sources failing marks failed", async () => {
  const nws: WeatherDataSource = { name: "nws", getSnapshot: async () => { throw new Error("down"); } };
  const res = await resolveWeatherSnapshots({ parsedMarket: { marketId:"m4", question:"", kind:"rain", operator:null, threshold:null, unit:null, locationText:"Seattle", targetDateText:"tomorrow", ambiguityReasons:[] }, registry:createWeatherSourceRegistry([nws]), logger });
  assert.equal(res.status, "failed");
});
