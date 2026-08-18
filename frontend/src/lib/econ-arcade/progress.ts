export const ECON_PROGRESS_KEY = "ballzatram:econ-progress:v1";

export type EconGameStatus = "unplayed" | "attempted" | "completed";
export type MasteryTier = "bronze" | "silver" | "gold";

export type EconGameProgress = {
  status: Exclude<EconGameStatus, "unplayed">;
  attempts: number;
  completions: number;
  bestScore?: number;
  lastScore?: number;
  lastOutcome?: string;
  concepts: string[];
  achievements?: string[];
  masteryTier?: MasteryTier;
  mastery?: Record<string, string | number | boolean>;
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
  achievements?: string[];
  masteryTier?: MasteryTier;
  mastery?: Record<string, string | number | boolean>;
  countAttempt?: boolean;
};

const emptyStore = (): EconProgressStore => ({ version: 1, games: {} });
export const masteryTierRank: Record<MasteryTier, number> = { bronze: 1, silver: 2, gold: 3 };
export const CORE_MASTERY_GAME_IDS = ["supply-demand-lab", "prisoners-dilemma-arena", "central-bank-simulator", "invisible-hands"] as const;
export const CAPSTONE_PREREQUISITE_IDS = ["supply-demand-lab", "prisoners-dilemma-arena", "central-bank-simulator"] as const;

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
  const achievements = Array.from(new Set([...(previous?.achievements ?? []), ...(update.achievements ?? [])]));
  const bestScore = score == null ? previous?.bestScore : Math.max(previous?.bestScore ?? score, score);
  const masteryTier = update.masteryTier && (!previous?.masteryTier || masteryTierRank[update.masteryTier] > masteryTierRank[previous.masteryTier])
    ? update.masteryTier
    : previous?.masteryTier;

  store.games[gameId] = {
    status: completed || previous?.status === "completed" ? "completed" : "attempted",
    attempts,
    completions,
    bestScore,
    lastScore: score ?? previous?.lastScore,
    lastOutcome: update.outcome ?? previous?.lastOutcome,
    concepts,
    achievements,
    masteryTier,
    mastery: { ...(previous?.mastery ?? {}), ...(update.mastery ?? {}) },
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

export function earnedAchievements(store: EconProgressStore): string[] {
  return Array.from(new Set(Object.values(store.games).flatMap((game) => game.achievements ?? []))).sort();
}

export function masteryScore(store: EconProgressStore): number {
  const earned = CORE_MASTERY_GAME_IDS.reduce((sum, gameId) => sum + (store.games[gameId]?.masteryTier ? masteryTierRank[store.games[gameId]!.masteryTier!] : 0), 0);
  return Math.round((earned / (CORE_MASTERY_GAME_IDS.length * masteryTierRank.gold)) * 100);
}

export function capstoneAccessTier(store: EconProgressStore): MasteryTier {
  const prerequisiteRanks = CAPSTONE_PREREQUISITE_IDS.map((gameId) => store.games[gameId]?.masteryTier ? masteryTierRank[store.games[gameId]!.masteryTier!] : 0);
  if (prerequisiteRanks.every((rank) => rank >= masteryTierRank.silver)) return "gold";
  if (prerequisiteRanks.every((rank) => rank >= masteryTierRank.bronze)) return "silver";
  return "bronze";
}

export function capstoneReadiness(store: EconProgressStore) {
  const access = capstoneAccessTier(store);
  const missingBronze = CAPSTONE_PREREQUISITE_IDS.filter((gameId) => (store.games[gameId]?.masteryTier ? masteryTierRank[store.games[gameId]!.masteryTier!] : 0) < masteryTierRank.bronze);
  const missingSilver = CAPSTONE_PREREQUISITE_IDS.filter((gameId) => (store.games[gameId]?.masteryTier ? masteryTierRank[store.games[gameId]!.masteryTier!] : 0) < masteryTierRank.silver);
  return { access, missingBronze, missingSilver };
}
