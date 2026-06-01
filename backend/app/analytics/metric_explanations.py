from __future__ import annotations


MetricExplanation = dict[str, object]


METRIC_EXPLANATIONS: dict[str, MetricExplanation] = {
    "dailyReturns": {
        "name": "Daily returns",
        "shortExplanation": "The percentage move from one close to the next.",
        "whyItMatters": "Returns are the raw material for volatility, drawdown, beta, and relative strength.",
        "caveats": ["One-day moves are noisy.", "Outliers can dominate short windows."],
        "interpretationRules": ["Use with a stated date range.", "Compare against benchmark and volume context before forming a thesis."],
    },
    "cumulativeReturns": {
        "name": "Cumulative returns",
        "shortExplanation": "Compounded performance over the selected window.",
        "whyItMatters": "Shows path-dependent total movement rather than isolated daily changes.",
        "caveats": ["Start date choice can change the story.", "Does not show risk taken to get there."],
        "interpretationRules": ["Pair with drawdown and volatility.", "Avoid treating a strong past window as a forecast."],
    },
    "rollingVolatility": {
        "name": "Rolling volatility",
        "shortExplanation": "Annualized movement measured over a trailing window.",
        "whyItMatters": "Highlights when price behavior is becoming calmer or more unstable.",
        "caveats": ["Volatility can fall before large moves.", "Window length changes the signal."],
        "interpretationRules": ["Rising volatility means uncertainty increased, not that direction is known.", "Compare like-for-like windows."],
    },
    "maxDrawdown": {
        "name": "Maximum drawdown",
        "shortExplanation": "Largest peak-to-trough loss in the selected window.",
        "whyItMatters": "Translates return history into the pain a holder would have experienced.",
        "caveats": ["A calm sample can understate future stress.", "It depends heavily on the selected start date."],
        "interpretationRules": ["More negative values mean deeper historical losses.", "Use with recovery time and liquidity context."],
    },
    "movingAverage": {
        "name": "Moving average",
        "shortExplanation": "Average price over a trailing window such as 20 or 50 sessions.",
        "whyItMatters": "Smooths noisy price action and helps frame trend context.",
        "caveats": ["Moving averages lag.", "Crossovers can whipsaw in sideways markets."],
        "interpretationRules": ["Price above an average can show trend strength, not certainty.", "Use multiple windows for context."],
    },
    "rsi": {
        "name": "RSI",
        "shortExplanation": "A momentum oscillator comparing recent gains with recent losses.",
        "whyItMatters": "Helps flag stretched short-term momentum conditions.",
        "caveats": ["Strong trends can stay overbought or oversold.", "RSI is sensitive to window choice."],
        "interpretationRules": ["Readings above 70 are often called stretched; below 30 are often called washed out.", "Treat it as context, not a trade instruction."],
    },
    "zScore": {
        "name": "Z-score",
        "shortExplanation": "How far the latest value sits from its average in standard-deviation units.",
        "whyItMatters": "Makes unusual moves easier to compare across different metrics.",
        "caveats": ["Assumes the comparison window is representative.", "Non-normal data can make z-scores look cleaner than reality."],
        "interpretationRules": ["Values near +/-2 are unusually far from the window average.", "Ask why the value moved before assigning meaning."],
    },
    "betaVsBenchmark": {
        "name": "Beta vs benchmark",
        "shortExplanation": "Sensitivity of an asset's returns to benchmark returns.",
        "whyItMatters": "Separates broad-market exposure from more idiosyncratic movement.",
        "caveats": ["Beta changes over time.", "A low beta does not mean low absolute risk."],
        "interpretationRules": ["Beta above 1 has historically amplified benchmark moves.", "Beta below 1 has historically moved less than the benchmark."],
    },
    "correlationMatrix": {
        "name": "Correlation matrix",
        "shortExplanation": "Pairwise return relationships between selected assets.",
        "whyItMatters": "Shows whether assets diversified each other in the sample.",
        "caveats": ["Correlation is not causation.", "Correlations often rise during stress."],
        "interpretationRules": ["Values near 1 moved together; near -1 moved oppositely.", "Do not use correlation alone as a diversification guarantee."],
    },
    "relativeStrength": {
        "name": "Relative strength",
        "shortExplanation": "Performance of an asset relative to a benchmark over the same window.",
        "whyItMatters": "Helps identify leadership or lagging behavior without making a prediction.",
        "caveats": ["Relative strength can reverse quickly.", "Benchmark choice changes the signal."],
        "interpretationRules": ["Positive values outperformed the benchmark over the window.", "Use with volatility and drawdown to judge quality."],
    },
    "yieldCurveSpreads": {
        "name": "Yield-curve spreads",
        "shortExplanation": "Differences between longer and shorter Treasury yields, such as 2Y/10Y or 3M/10Y.",
        "whyItMatters": "Curve shape summarizes policy pressure, growth expectations, and term-premium context.",
        "caveats": ["Curve inversions are not timers.", "Synthetic/demo rates are not real market data."],
        "interpretationRules": ["Negative spreads indicate inversion.", "Review 2Y/10Y and 3M/10Y with inflation and credit context."],
    },
    "regimeScore": {
        "name": "Regime score",
        "shortExplanation": "A simple descriptive score combining volatility, drawdown, trend, and curve context.",
        "whyItMatters": "Bundles several risk-context checks into one explainable dashboard label.",
        "caveats": ["It is a heuristic, not a forecast.", "Inputs can conflict or become stale."],
        "interpretationRules": ["Risk-on, mixed, and risk-off labels describe the current sample only.", "Always inspect the reasons and caveats."],
    },
}


def metric_explanations(ids: list[str] | None = None) -> dict[str, MetricExplanation]:
    if ids is None:
        return METRIC_EXPLANATIONS
    return {metric_id: METRIC_EXPLANATIONS[metric_id] for metric_id in ids if metric_id in METRIC_EXPLANATIONS}

