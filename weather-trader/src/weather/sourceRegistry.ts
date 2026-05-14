import type { AppConfig } from "../config/config.js";
import { NwsClient } from "./nwsClient.js";
import { OpenMeteoClient } from "./openMeteoClient.js";
import type { Coordinates, WeatherDataSource } from "./types.js";

export interface WeatherSourceRegistry {
  all(): WeatherDataSource[];
  forLocation(location: Coordinates): WeatherDataSource[];
}

export function createDefaultWeatherSourceRegistry(config: AppConfig): WeatherSourceRegistry {
  const nws = new NwsClient({
    baseUrl: config.nwsBaseUrl,
    userAgent: config.nwsUserAgent,
    timeoutMs: config.requestTimeoutMs,
  });
  const openMeteo = new OpenMeteoClient({
    baseUrl: config.openMeteoBaseUrl,
    timeoutMs: config.requestTimeoutMs,
  });

  return createWeatherSourceRegistry([nws, openMeteo]);
}

export function createWeatherSourceRegistry(sources: WeatherDataSource[]): WeatherSourceRegistry {
  return {
    all: () => [...sources],
    forLocation: (location) => {
      const globalSources = sources.filter((source) => source.name !== "nws");
      const usSources = isLikelyUnitedStates(location) ? sources.filter((source) => source.name === "nws") : [];
      return [...usSources, ...globalSources];
    },
  };
}

export function isLikelyUnitedStates(location: Coordinates): boolean {
  const { latitude, longitude } = location;
  const contiguousUs = latitude >= 24 && latitude <= 50 && longitude >= -125 && longitude <= -66;
  const alaska = latitude >= 51 && latitude <= 72 && longitude >= -170 && longitude <= -129;
  const hawaii = latitude >= 18 && latitude <= 23 && longitude >= -161 && longitude <= -154;
  const puertoRico = latitude >= 17 && latitude <= 19 && longitude >= -68 && longitude <= -65;
  return contiguousUs || alaska || hawaii || puertoRico;
}
