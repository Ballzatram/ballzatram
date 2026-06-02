import { ToolSectionPage } from "@/components/launchpad/ToolSectionPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Markets & Risk | Ballzatram",
  description: "Explainable market and portfolio analysis experiments for education and research only.",
  path: "/markets",
});

export default function MarketsPage() {
  return (
    <ToolSectionPage
      category="markets"
      title="Markets & Risk"
      eyebrow="Education and research"
      description="Quant Library is the main markets page, with older workflow routes kept visible for portfolio, scenario, event-study, model, and report experiments."
      positioning="Demo / research / education. Not investment advice, no financial advice, and no live trading."
      primaryToolId="quant-library"
    />
  );
}
