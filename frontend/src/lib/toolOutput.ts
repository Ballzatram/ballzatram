export type ToolConfidence = "low" | "medium" | "high";
export type ToolStatus = "empty" | "complete" | "partial_success" | "error";
export type ToolCardType = "opportunity" | "risk" | "recommendation" | "data" | "next_step";

export type ToolSource = {
  title: string;
  url?: string | null;
  status?: "live" | "fallback" | "missing" | "unknown";
  description?: string;
};

export type ToolAction = {
  label: string;
  description?: string;
  href?: string | null;
};

export type ToolCard = {
  id?: string;
  title: string;
  type: ToolCardType;
  content: string;
  confidence?: ToolConfidence;
  assumptions?: string[];
  sources?: ToolSource[];
  actions?: ToolAction[];
  metrics?: Record<string, number | string>;
  tableData?: unknown;
  chartData?: unknown;
  methodology?: string;
  caveats?: string[];
  thesis?: string;
};

export type ToolRisk = {
  title: string;
  severity?: "low" | "medium" | "high";
  content: string;
  mitigation?: string;
  confidence?: ToolConfidence;
};

export type ToolOutput = {
  summary: string;
  cards: ToolCard[];
  risks: ToolRisk[];
  missingData: string[];
  recommendedNextSteps: string[];
  sources: ToolSource[];
  confidence: ToolConfidence;
  status: ToolStatus;
};

export const emptyToolOutput: ToolOutput = {
  summary: "",
  cards: [],
  risks: [],
  missingData: [],
  recommendedNextSteps: [],
  sources: [],
  confidence: "medium",
  status: "empty",
};

