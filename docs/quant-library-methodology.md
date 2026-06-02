# Quant Library Methodology

Date: 2026-06-02

## Methodology doctrine

Quant Library should use serious, standard financial econometrics and quantitative finance methods. It should not invent proprietary-sounding math to create false authority.

Every method should answer:

- What does this measure?
- Why does it matter?
- How should the user interpret it?
- What can make it misleading?
- What data does it require?
- Is it MVP or future phase?
- How should the UI explain it in plain English?

Existing code:

- `backend/app/analytics/quant_library.py` already implements daily returns, cumulative returns, rolling volatility, max drawdown, moving average, RSI, z-score, beta vs benchmark, correlation matrix, relative strength, yield-curve spreads, and a simple regime score.
- `backend/app/analytics/models.py` already implements simple returns, log returns, annualized return/volatility, Sharpe/Sortino, beta/alpha, rolling beta, OLS/rolling regression, VaR/expected shortfall, basic regime detection, event studies, and stress tests.
- `backend/tests/test_quant_library_foundation.py` and `backend/tests/test_analytics.py` cover parts of the current analytics foundation.

## Method catalog

| Method | Measures | Why it matters | Interpretation | Common false signals | Minimum data | Phase | UI explanation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Simple returns | Percentage change from one observation to the next. | Raw material for most risk and performance metrics. | Positive means price rose over the interval; negative means it fell. | One-period returns are noisy and outliers can dominate short samples. | At least 2 clean price points. | MVP | "This is the percent move from one close to the next." |
| Log returns | Log change in price. | Useful for aggregation and statistical modeling. | Similar to simple returns for small changes; adds more cleanly across time. | Users may confuse it with actual account return. | At least 2 positive price points. | MVP backend, optional UI | "This is a modeling-friendly return measure, not a separate market signal." |
| Cumulative returns | Compounded return over a selected window. | Shows total path movement over the window. | Higher means stronger compounded performance in that sample. | Start-date selection can change the story. | Return series with at least 2 observations. | MVP | "This shows how the selected asset moved over the full window." |
| Rolling volatility | Annualized standard deviation over a trailing window. | Identifies calmer vs more unstable periods. | Rising volatility means uncertainty increased, not direction. | Window length changes the signal; volatility can fall before shocks. | 20+ returns preferred; 5 minimum for prototype. | MVP | "This measures how jumpy returns have been recently." |
| Realized volatility | Volatility computed from observed high-frequency or daily returns over a realized period. | Gives a backward-looking estimate of actual movement. | Compare across assets and periods using the same frequency. | Frequency mismatches and missing observations distort it. | Daily returns for MVP; intraday future. | MVP daily, future intraday | "This is what volatility actually looked like in the observed data." |
| Rolling drawdown | Peak-to-trough decline at each point in time. | Shows the path of pain, not just endpoint return. | More negative values mean deeper decline from prior peak. | A short or calm sample understates future stress. | Return or price series. | MVP | "This shows how far the asset was below its recent high." |
| Max drawdown | Worst peak-to-trough decline in the selected window. | Converts history into downside stress. | A deeper drawdown means the sample contained larger loss from peak. | Depends heavily on window choice. | Return or price series. | MVP | "This is the worst historical drop from a high in this sample." |
| Correlation | Pairwise co-movement between returns. | Reveals diversification or hidden overlap in the sample. | Near 1 moved together; near -1 moved opposite; near 0 had weak linear relationship. | Correlation is not causation and often rises during stress. | Aligned returns; 30+ observations preferred. | MVP | "This shows which assets moved together in the sample." |
| Rolling correlation | Correlation over a moving window. | Shows whether relationships are stable or changing. | Rising correlation can indicate crowded or stress behavior. | Small windows jump around; crisis periods can dominate. | Aligned returns; 60+ observations preferred. | MVP for Risk desk if time allows | "This checks whether relationships changed over time." |
| Beta vs benchmark | Sensitivity of asset returns to benchmark returns. | Separates broad-market exposure from idiosyncratic behavior. | Beta above 1 historically amplified benchmark moves; below 1 moved less. | Beta changes; low beta does not equal low absolute risk. | Aligned asset and benchmark returns; 60+ preferred. | MVP | "This estimates how strongly the asset moved with the benchmark." |
| Rolling beta | Beta over a moving window. | Shows changing benchmark sensitivity. | Rising beta can indicate increasing market dependence. | Window choice and outliers can dominate. | Aligned returns; 120+ preferred for daily data. | MVP/future depending UI scope | "This checks whether benchmark sensitivity has been stable." |
| Yield-curve spreads | Difference between longer and shorter Treasury yields, such as 10Y minus 2Y. | Summarizes policy pressure, growth expectations, and term-premium context. | Negative spread means inversion. | Inversions are not countdown clocks. | 3M, 2Y, 10Y histories at minimum. | MVP | "This compares short and long rates to read curve shape." |
| Curve level | Average yield across selected tenors. | Captures broad rate environment. | Higher level means rates are broadly higher across the curve. | Averages can hide steepening/flattening. | Current curve with 3+ tenors. | MVP | "This is the overall height of the yield curve." |
| Curve slope | Long-rate minus short-rate dimension. | Captures steepening or inversion. | Positive usually means longer rates exceed short rates; negative means inversion. | Term premium and policy effects can blur interpretation. | Current and historical rates. | MVP | "This is whether long rates sit above or below short rates." |
| Curve curvature | Middle-tenor shape relative to short and long ends. | Helps distinguish belly-led moves from parallel shifts. | High curvature means the middle of the curve is rich/cheap relative to ends. | Sparse tenors can make it unstable. | 3+ tenors; 5+ preferred. | MVP/future | "This checks whether the middle of the curve is behaving differently." |
| Yield-curve PCA | Statistical decomposition of curve moves into level, slope, and curvature factors. | Standard rates desk method for explaining curve movement. | PC1 often maps to level, PC2 to slope, PC3 to curvature, but labels must be verified. | PCA loadings can change by sample and frequency. | Historical matrix of multiple tenors; 2+ years preferred. | Future unless rates foundation is stable early | "This separates curve movement into broad rate, slope, and bend components." |
| Z-scores | Distance from mean in standard deviation units. | Makes unusual values comparable across metrics. | Around +/-2 is unusual relative to the chosen window. | Non-normal data and bad windows make clean numbers misleading. | 20+ observations; 60+ preferred. | MVP | "This asks how unusual the latest value is compared with its own recent history." |
| Moving averages | Average price or metric over a lookback window. | Smooths noisy series for trend context. | Price above/below average is context, not an instruction. | Lagging signal; whipsaws in sideways markets. | Price series; 20/50 sessions for MVP. | MVP teaching signal | "This smooths price to make trend context easier to see." |
| RSI | Momentum oscillator based on recent gains and losses. | Teaches stretched momentum without pretending magic. | Above 70 is often called stretched; below 30 is often called washed out. | Strong trends can stay stretched; window choice matters. | 14+ price observations. | MVP teaching signal only | "This is a momentum context gauge, not a trade command." |
| ADF stationarity test | Tests whether a time series likely has a unit root. | Helps decide if a series should be differenced or modeled as levels. | Low p-value can suggest stationarity under test assumptions. | Test power is limited; structural breaks can mislead. | 50+ observations preferred. | Future, advanced notes | "This checks whether a series behaves more like a stable process or a drifting one." |
| KPSS stationarity test | Tests stationarity with opposite null from ADF. | Complements ADF for more cautious inference. | Low p-value can reject stationarity. | Sensitive to lag choices and structural breaks. | 50+ observations preferred. | Future, advanced notes | "This is a second stationarity check that asks the question from the opposite direction." |
| Regime classification | Labels current market state using transparent rules or models. | Organizes multiple signals into a readable state. | Label describes the sample, not the future. | Thresholds can overfit and labels can create false certainty. | Cross-asset metrics and rates context. | MVP transparent heuristic; future model | "This summarizes current conditions using visible inputs and caveats." |
| Z-score anomaly flags | Flags values far from recent history. | Simple, explainable anomaly screen. | Flag means worth investigating. | Unusual does not mean wrong or tradable. | 20+ observations. | MVP | "This marks values that are far from their recent norm." |
| Local Outlier Factor | Density-based anomaly detection. | Can detect multivariate outliers beyond one z-score. | A high outlier score means the observation is unusual relative to neighbors. | Harder to explain; sensitive to scaling and neighborhood choice. | Clean multivariate matrix; 100+ observations preferred. | Future | "This compares each observation with similar historical neighbors to spot unusual combinations." |
| Scenario shocks | User-selected changes to rates, growth, credit, volatility, or prices. | Makes assumptions explicit and testable. | Output is conditional on the shock and model mapping. | Linear mappings fail in crises; shocks can be arbitrary. | Return/factor history or documented factor map. | MVP | "This asks what the model estimates under a stated shock." |
| Stress tests | Severe but plausible scenario estimates. | Forces analysis to consider downside and fragility. | Treat as sensitivity analysis, not forecast. | Calibration can be too gentle or too dramatic. | Factors, holdings/weights or asset proxies. | MVP | "This checks what could happen if conditions move against the sample." |
| Historical analogs | Compares current state to prior similar periods. | Gives context for past outcomes under similar conditions. | Analog is a reference case, not destiny. | Data mining and narrative overfit are serious risks. | Long history across assets/factors. | Future | "This finds past periods that looked similar, then shows what happened and why it may not repeat." |

## MVP method boundaries

Use these in MVP:

- Simple returns.
- Log returns in backend calculations where appropriate.
- Cumulative returns.
- Rolling volatility and realized volatility from daily returns.
- Rolling drawdown and max drawdown.
- Correlation matrix and basic rolling correlation.
- Beta and rolling beta.
- Yield-curve spreads.
- Curve level/slope/curvature.
- Z-scores.
- Moving averages and RSI as teaching context.
- Transparent regime heuristic.
- Z-score anomaly flags.
- Scenario shocks and basic stress tests.

Document but defer unless implementation quality is high:

- PCA for curve decomposition.
- ADF/KPSS stationarity tests.
- Local Outlier Factor.
- Historical analog search.
- Advanced regime classification.

## Interpretation standards

Every method panel should include:

- Lookback window.
- Data frequency.
- Provider/source.
- Data as-of date.
- Minimum data warning when sample is thin.
- Plain-English readout.
- "This may suggest..." interpretation.
- "This does not prove..." caveat.
- "What to check next" prompt.

## Safety copy examples

Preferred:

- "This may suggest volatility is elevated relative to the recent window."
- "Historically, this can indicate curve pressure, but it is not a timer."
- "Worth investigating whether the benchmark is the right comparison."
- "This does not prove causation."
- "The model may be wrong if the relationship changed."

Avoid:

- "Buy"
- "Sell"
- "Guaranteed"
- "Prediction"
- "This proves"
- "Risk-free"
- "Lock"
