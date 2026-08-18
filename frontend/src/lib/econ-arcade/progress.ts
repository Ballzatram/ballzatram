export const ECON_PROGRESS_KEY = "ballzatram:econ-progress:v1";

export type EconGameStatus = "unplayed" | "attempted" | "completed";

export type EconGameProgress = {
  status: Exclude<EconGameStatus, "unplayed">;
  attempts: number;
  completions: number;
  bestScore?: number;
  lastScore?: number;
  lastOutcome?: string;
  concepts: string[];
  updatedAt: string;
};

export type EconProgressStore = {
  version: 1;
  games: Record<string, EconGameProgress>;
};

export type ProgressUpdate = {
  completed?: boolean;
  score?: number;
  outcome?: string;
  concepts?: string[];
  countAttempt?: boolean;
};

const emptyStore = (): EconProgressStore => ({ version: 1, games: {} });

export function readEconProgress(): EconProgressStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ECON_PROGRESS_KEY) || "null") as EconProgressStore | null;
    if (!parsed || parsed.version !== 1 || typeof parsed.games !== "object") return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function recordEconProgress(gameId: string, update: ProgressUpdate): EconProgressStore {
  if (typeof window === "undefined") return emptyStore();
  const store = readEconProgress();
  const previous = store.games[gameId];
  const score = Number.isFinite(update.score) ? Number(update.score) : undefined;
  const completed = Boolean(update.completed);
  const attempts = (previous?.attempts ?? 0) + (update.countAttempt === false ? 0 : 1);
  const completions = (previous?.completions ?? 0) + (completed ? 1 : 0);
  const concepts = Array.from(new Set([...(previous?.concepts ?? []), ...(update.concepts ?? [])]));
  const bestScore = score == null ? previous?.bestScore : Math.max(previous?.bestScore ?? score, score);

  store.games[gameId] = {
    status: completed || previous?.status === "completed" ? "completed" : "attempted",
    attempts,
    completions,
    bestScore,
    lastScore: score ?? previous?.lastScore,
    lastOutcome: update.outcome ?? previous?.lastOutcome,
    concepts,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(ECON_PROGRESS_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("ballzatram:econ-progress", { detail: store }));
  return store;
}

export function gameStatus(store: EconProgressStore, gameId: string): EconGameStatus {
  return store.games[gameId]?.status ?? "unplayed";
}

export function masteredConcepts(store: EconProgressStore): string[] {
  return Array.from(new Set(Object.values(store.games).flatMap((game) => game.concepts))).sort();
}
