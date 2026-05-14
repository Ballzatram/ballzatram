import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { openMarketSnapshotStore } from "./db/marketSnapshotStore.js";

const require = createRequire(import.meta.url);

test("market snapshot store persists snapshots and weather-market rows to SQLite", () => {
  const dir = mkdtempSync(join(tmpdir(), "weather-trader-"));
  const dbPath = join(dir, "snapshots.sqlite");
  const store = openMarketSnapshotStore(dbPath);

  store.saveMarketSnapshot(
    {
      id: "fixture-weather-1",
      question: "Will Seattle get rain tomorrow?",
      slug: "rain-seattle-tomorrow",
      active: true,
      closed: false,
      clobTokenIds: '["yes","no"]',
    },
    true,
  );
  store.close();

  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => {
      prepare(sql: string): { get(): Record<string, unknown> | undefined };
      close(): void;
    };
  };
  const db = new DatabaseSync(dbPath);
  const snapshots = db.prepare("SELECT COUNT(*) AS count FROM polymarket_market_snapshots").get();
  const weatherMarkets = db.prepare("SELECT COUNT(*) AS count FROM weather_markets").get();
  db.close();
  rmSync(dir, { recursive: true, force: true });

  assert.equal(snapshots?.count, 1);
  assert.equal(weatherMarkets?.count, 1);
});
