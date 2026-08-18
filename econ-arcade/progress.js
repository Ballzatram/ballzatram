(() => {
  const KEY = "ballzatram:econ-progress:v1";
  const tierRank = { bronze: 1, silver: 2, gold: 3 };

  function read() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!parsed || parsed.version !== 1 || typeof parsed.games !== "object") return { version: 1, games: {} };
      return parsed;
    } catch {
      return { version: 1, games: {} };
    }
  }

  function record(gameId, update = {}) {
    const store = read();
    const previous = store.games[gameId];
    const score = Number.isFinite(update.score) ? Number(update.score) : undefined;
    const completed = Boolean(update.completed);
    const attempts = (previous?.attempts || 0) + (update.countAttempt === false ? 0 : 1);
    const completions = (previous?.completions || 0) + (completed ? 1 : 0);
    const concepts = Array.from(new Set([...(previous?.concepts || []), ...(update.concepts || [])]));
    const achievements = Array.from(new Set([...(previous?.achievements || []), ...(update.achievements || [])]));
    const bestScore = score == null ? previous?.bestScore : Math.max(previous?.bestScore ?? score, score);
    const masteryTier = update.masteryTier && (!previous?.masteryTier || tierRank[update.masteryTier] > tierRank[previous.masteryTier])
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
      mastery: { ...(previous?.mastery || {}), ...(update.mastery || {}) },
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("ballzatram:econ-progress", { detail: store }));
    return store;
  }

  window.BallzatramEconProgress = { key: KEY, read, record };
})();
