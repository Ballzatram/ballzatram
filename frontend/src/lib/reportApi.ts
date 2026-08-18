export type ReportMarkdownRequest = {
  title: string;
  findings: string[];
  scenario_outcomes: Record<string, number>;
};

export type ReportMarkdownResponse = { markdown: string };

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

export async function renderMarkdownReport(body: ReportMarkdownRequest): Promise<ReportMarkdownResponse> {
  const response = await fetch(`${BASE}/reports/markdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Report request failed with status ${response.status}`);
  }
  return response.json() as Promise<ReportMarkdownResponse>;
}
