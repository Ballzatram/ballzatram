export type WorkflowMetric = {
  label: string;
  value: string;
  sub: string;
};

export type WorkflowAction = {
  label: string;
  detail: string;
};

export type Workflow = {
  slug: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  metrics: WorkflowMetric[];
  chart: { name: string; value: number }[];
  actions: WorkflowAction[];
  checklist: string[];
  emptyState: string;
};

export const workflows: Workflow[] = [
  {
    slug: "dashboard",
    navLabel: "Dashboard",
    eyebrow: "Command center",
    title: "Quant Library operating dashboard",
    description:
      "Monitor demo data freshness, model coverage, and the workflows needed to move from exploratory market analysis to a plain-English research note.",
    badge: "Live demo data",
    metrics: [
      { label: "Signal health", value: "81%", sub: "Composite confidence across enabled demo models" },
      { label: "Data window", value: "24m", sub: "Monthly macro history available in the bundled dataset" },
      { label: "Workflow coverage", value: "7", sub: "Analysis surfaces with consistent assumptions and review steps" },
    ],
    chart: [
      { name: "Q1", value: 46 },
      { name: "Q2", value: 54 },
      { name: "Q3", value: 49 },
      { name: "Q4", value: 63 },
      { name: "Q5", value: 67 },
      { name: "Q6", value: 72 },
    ],
    actions: [
      { label: "Start with stock analysis", detail: "Estimate macro factor sensitivity before scenario work." },
      { label: "Run scenario lab", detail: "Translate rate, inflation, and recession shocks into portfolio impact." },
      { label: "Generate report", detail: "Package findings, caveats, and next steps for decision makers." },
    ],
    checklist: [
      "Confirm uploaded CSV dates and missing values before running models.",
      "Review factor signs against economic intuition.",
      "Treat dashboard confidence as a triage signal, not a trading recommendation.",
    ],
    emptyState: "Upload a portfolio or macro CSV to replace the demo dataset and unlock workspace-specific commentary.",
  },
  {
    slug: "stock",
    navLabel: "Stock Analysis",
    eyebrow: "Single-name model",
    title: "Stock macro sensitivity review",
    description:
      "Explain how a selected equity historically moved with rates, inflation, growth, credit stress, and commodity inputs using transparent model diagnostics.",
    badge: "Regression ready",
    metrics: [
      { label: "Rate beta", value: "-0.42", sub: "Demo coefficient versus real 10-year yield changes" },
      { label: "CPI sensitivity", value: "-0.18", sub: "Lower is better for inflation shock resilience" },
      { label: "Model fit", value: "0.64 R2", sub: "Enough to inform questions, not enough to automate trades" },
    ],
    chart: [
      { name: "Rates", value: -42 },
      { name: "CPI", value: -18 },
      { name: "ISM", value: 31 },
      { name: "Oil", value: -9 },
      { name: "Credit", value: -27 },
    ],
    actions: [
      { label: "Validate ticker inputs", detail: "Use clean return series and align dates before fitting." },
      { label: "Inspect residuals", detail: "Look for event-driven breaks and outliers." },
      { label: "Compare factors", detail: "Separate durable signals from correlated macro noise." },
    ],
    checklist: [
      "Use split-adjusted prices and consistent return frequency.",
      "Flag coefficients that change sign across rolling windows.",
      "Document excluded events such as mergers, splits, or crisis periods.",
    ],
    emptyState: "Enter a ticker and macro factor set to generate the first sensitivity table.",
  },
  {
    slug: "portfolio",
    navLabel: "Portfolio Analysis",
    eyebrow: "Portfolio lens",
    title: "Portfolio exposure decomposition",
    description:
      "Turn position weights into factor exposures, concentration alerts, drawdown risks, and prioritized due-diligence questions.",
    badge: "CSV workflow",
    metrics: [
      { label: "Holdings loaded", value: "18", sub: "Demo portfolio rows available for inspection" },
      { label: "Top-5 weight", value: "47%", sub: "Concentration requiring explicit review" },
      { label: "Stress loss", value: "-24%", sub: "Illustrative recession shock from demo settings" },
    ],
    chart: [
      { name: "Mega cap", value: 36 },
      { name: "Cyclicals", value: 18 },
      { name: "Defensive", value: 24 },
      { name: "Rates", value: 12 },
      { name: "Cash", value: 10 },
    ],
    actions: [
      { label: "Upload holdings", detail: "Validate ticker, quantity, price, and sector fields." },
      { label: "Normalize weights", detail: "Check gross, net, cash, and duplicate tickers." },
      { label: "Prioritize reviews", detail: "Surface holdings that drive the largest modeled downside." },
    ],
    checklist: [
      "Reject files with missing tickers or non-numeric weights.",
      "Reconcile total market value against source-of-truth statements.",
      "Separate model risk from position-sizing risk in the memo.",
    ],
    emptyState: "Upload a holdings CSV to replace the demo portfolio and populate concentration diagnostics.",
  },
  {
    slug: "scenario",
    navLabel: "Scenario Lab",
    eyebrow: "Stress testing",
    title: "Macro scenario lab",
    description:
      "Translate changes in inflation, rates, growth, oil, and credit into explicit upside/downside ranges with assumption traceability.",
    badge: "Assumption driven",
    metrics: [
      { label: "Base case", value: "+7%", sub: "Demo expected return under neutral macro inputs" },
      { label: "Bear case", value: "-24%", sub: "Recession plus wider credit spread template" },
      { label: "Shock count", value: "5", sub: "Macro levers available in the current API schema" },
    ],
    chart: [
      { name: "Base", value: 7 },
      { name: "Inflation", value: -11 },
      { name: "Rates", value: -16 },
      { name: "Credit", value: -22 },
      { name: "Growth", value: -24 },
    ],
    actions: [
      { label: "Set shocks", detail: "Make every assumption visible and editable." },
      { label: "Run sensitivity", detail: "Find which macro lever dominates portfolio loss." },
      { label: "Export narrative", detail: "Convert scenario output into an investment committee-ready note." },
    ],
    checklist: [
      "Keep shock magnitudes plausible for the horizon being modeled.",
      "Use ranges where confidence is low rather than false precision.",
      "Record the date, data window, and owner of each scenario pack.",
    ],
    emptyState: "Choose shock magnitudes to calculate a scenario table and explain the dominant risk driver.",
  },
  {
    slug: "event-study",
    navLabel: "Event Study",
    eyebrow: "Catalyst analysis",
    title: "Event study workbench",
    description:
      "Measure returns around CPI releases, Fed decisions, earnings, or custom dates while preserving clean pre/post windows and caveats.",
    badge: "Window controlled",
    metrics: [
      { label: "Event window", value: "+/-5d", sub: "Default review horizon around each catalyst" },
      { label: "Avg reaction", value: "+1.8%", sub: "Demo cumulative abnormal return" },
      { label: "Hit rate", value: "62%", sub: "Share of events matching expected direction" },
    ],
    chart: [
      { name: "-5", value: -2 },
      { name: "-3", value: -1 },
      { name: "0", value: 0 },
      { name: "+1", value: 2 },
      { name: "+3", value: 3 },
      { name: "+5", value: 2 },
    ],
    actions: [
      { label: "Load events", detail: "Use exact catalyst dates and event labels." },
      { label: "Pick benchmark", detail: "Measure abnormal returns against a relevant market proxy." },
      { label: "Review overlap", detail: "Remove windows contaminated by other major catalysts." },
    ],
    checklist: [
      "Avoid overlapping windows unless the methodology explicitly handles them.",
      "Report sample size prominently.",
      "Inspect both average and median reactions to avoid outlier bias.",
    ],
    emptyState: "Add event dates to produce a pre/post return curve and summary table.",
  },
  {
    slug: "model-compare",
    navLabel: "Model Comparison",
    eyebrow: "Governance",
    title: "Model comparison and validation",
    description:
      "Compare OLS, rolling windows, regularized models, and stress templates with transparent fit, stability, and interpretability tradeoffs.",
    badge: "Governance layer",
    metrics: [
      { label: "Best validation", value: "Ridge", sub: "Demo ranking after stability penalty" },
      { label: "Drift flag", value: "Medium", sub: "Coefficient movement above monitoring threshold" },
      { label: "Models tracked", value: "4", sub: "OLS, rolling OLS, ridge, and scenario templates" },
    ],
    chart: [
      { name: "OLS", value: 58 },
      { name: "Rolling", value: 64 },
      { name: "Ridge", value: 71 },
      { name: "Stress", value: 62 },
    ],
    actions: [
      { label: "Compare out-of-sample", detail: "Prefer validation performance over in-sample fit." },
      { label: "Review stability", detail: "Penalize models that flip signs across regimes." },
      { label: "Document choice", detail: "Leave an audit trail for the selected model." },
    ],
    checklist: [
      "Separate model-selection metrics from investment conclusions.",
      "Track when training windows or factor definitions change.",
      "Require human sign-off before operational use.",
    ],
    emptyState: "Run at least two model variants to populate the comparison matrix.",
  },
  {
    slug: "classroom",
    navLabel: "Model Classroom",
    eyebrow: "Learning mode",
    title: "Model classroom",
    description:
      "Explain the analytics in plain English so users understand beta, factor importance, confidence, regime breaks, and model limitations.",
    badge: "Education built in",
    metrics: [
      { label: "Concept cards", value: "12", sub: "Plain-language explanations for key analytics" },
      { label: "Caveat prompts", value: "9", sub: "Questions that prevent overconfident model use" },
      { label: "Read time", value: "6m", sub: "Designed for fast onboarding before analysis" },
    ],
    chart: [
      { name: "Inputs", value: 30 },
      { name: "Model", value: 55 },
      { name: "Diagnostics", value: 70 },
      { name: "Memo", value: 85 },
    ],
    actions: [
      { label: "Teach the metric", detail: "Define what each number means and what it cannot prove." },
      { label: "Show a caveat", detail: "Pair every chart with a model-risk warning." },
      { label: "Connect to workflow", detail: "Link concepts directly to the relevant analysis page." },
    ],
    checklist: [
      "Avoid jargon without examples.",
      "State when correlation is not causation.",
      "Use classroom content to improve user decisions, not decorate the page.",
    ],
    emptyState: "Open any workflow and ask the agent to explain a metric in classroom terms.",
  },
  {
    slug: "reports",
    navLabel: "Reports",
    eyebrow: "Decision memo",
    title: "Report builder",
    description:
      "Collect charts, assumptions, scenario outputs, and analyst notes into a concise Markdown report with explicit limitations.",
    badge: "Export path",
    metrics: [
      { label: "Sections", value: "6", sub: "Executive summary, data, models, scenarios, risks, next steps" },
      { label: "Caveats", value: "Required", sub: "Every report includes model limitations by design" },
      { label: "Review status", value: "Draft", sub: "Human approval remains part of the workflow" },
    ],
    chart: [
      { name: "Data", value: 80 },
      { name: "Model", value: 68 },
      { name: "Scenario", value: 72 },
      { name: "Risk", value: 88 },
      { name: "Memo", value: 76 },
    ],
    actions: [
      { label: "Select findings", detail: "Promote only validated outputs into the memo." },
      { label: "Add caveats", detail: "Explain model risk, data quality, and assumptions." },
      { label: "Share draft", detail: "Export Markdown for review before any user action." },
    ],
    checklist: [
      "Do not present generated reports as investment advice.",
      "Include the dataset timestamp and owner.",
      "Preserve assumptions alongside every scenario conclusion.",
    ],
    emptyState: "Run an analysis workflow first, then generate a Markdown report from selected findings.",
  },
];

export const workflowBySlug = Object.fromEntries(workflows.map((workflow) => [workflow.slug, workflow])) as Record<string, Workflow>;
