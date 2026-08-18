(() => {
  const PORTFOLIO_KEY = "ballzatram:portfolio-pages-last-run:v1";
  sourceMeta.portfolio = { label: "Portfolio Lab", color: "cyan" };

  function portfolioToReportSection(run) {
    const metrics = run.metrics || {};
    const top = Array.isArray(run.holdings) ? run.holdings.slice().sort((a, b) => b.normalizedWeight - a.normalizedWeight)[0] : null;
    return {
      id: `portfolio-${run.savedAt || Date.now()}`,
      sourceKind: "portfolio",
      title: "Portfolio Lab",
      createdAt: run.savedAt || new Date().toISOString(),
      findings: [
        `Portfolio cumulative return: ${pct(metrics.cumulativeReturn)}; annualized return: ${pct(metrics.annualizedReturn)}.`,
        `Annualized volatility: ${pct(metrics.annualizedVolatility)}; max drawdown: ${pct(metrics.maxDrawdown)}.`,
        metrics.betaVsBenchmark != null ? `Beta versus ${run.request?.benchmark || "benchmark"}: ${num(metrics.betaVsBenchmark, 3)}; correlation: ${num(metrics.correlationVsBenchmark, 3)}.` : "Benchmark-relative beta/correlation were not available for this run.",
        `Top holding weight: ${pct(metrics.topHoldingWeight)}; effective positions: ${num(metrics.effectivePositions, 1)}${top ? `; largest holding: ${top.symbol} at ${pct(top.normalizedWeight)}` : ""}.`
      ],
      assumptions: [
        "Portfolio weights are normalized across the supplied holdings.",
        "Volatility, covariance, beta, correlation, drawdown, and risk contribution are estimated from the supplied historical price series.",
        "Historical relationships are descriptive and are not forecasts."
      ],
      provenance: [
        `Saved browser run: ${run.savedAt || "unknown time"}.`,
        `Data mode: ${run.sourceMode === "demo" ? "synthetic demo data" : "user-supplied local CSV"}.`,
        `Window: ${run.startDate || "unknown"} to ${run.endDate || "unknown"}; ${run.observations ?? "unknown"} return observations.`,
        `Holdings: ${(run.request?.holdings || []).map((holding) => `${holding.symbol}=${holding.weight}`).join(", ") || "not recorded"}.`
      ],
      warnings: Array.isArray(run.warnings) ? run.warnings : ["Portfolio analysis is historical/descriptive, not investment advice."]
    };
  }

  function getPortfolioSource() {
    const run = safeParse(localStorage.getItem(PORTFOLIO_KEY));
    return run?.metrics ? portfolioToReportSection(run) : null;
  }

  function renderPortfolioSource() {
    const source = getPortfolioSource();
    availableSources.portfolio = source || undefined;
    const added = sections.some((section) => section.sourceKind === "portfolio");
    const card = document.createElement("article");
    card.className = `source-card ${source ? "available" : "missing"}`;
    card.innerHTML = `<div><span class="source-dot cyan"></span><strong>Portfolio Lab</strong></div><small>${source ? `Saved ${new Date(source.createdAt).toLocaleString()}` : "No saved run in this browser"}</small><button ${!source || added ? "disabled" : ""}>${added ? "Added" : source ? "Add to report" : "Run lab first"}</button>`;
    card.querySelector("button").addEventListener("click", () => {
      if (!source || added) return;
      sections.push(structuredClone(source));
      saveDraft();
      renderAll();
    });
    $("sourceList").appendChild(card);
  }

  const baseRenderAll = renderAll;
  renderAll = function renderAllWithPortfolio() {
    baseRenderAll();
    renderPortfolioSource();
  };

  renderAll();
})();
