import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type EnvSource = Record<string, string | undefined>;

export function loadDotEnvFile(filePath = resolve(process.cwd(), ".env")): EnvSource {
  try {
    const contents = readFileSync(filePath, "utf8");
    return parseDotEnv(contents);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export function parseDotEnv(contents: string): EnvSource {
  const values: EnvSource = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    values[key] = unwrapEnvValue(rawValue);
  }

  return values;
}

function unwrapEnvValue(value: string): string {
  const first = value.at(0);
  const last = value.at(-1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}
