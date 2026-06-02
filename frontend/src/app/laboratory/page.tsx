import { ToolSectionPage } from "@/components/launchpad/ToolSectionPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Creative / AI Lab | Ballzatram",
  description: "Creative AI experiments, generated-story previews, and prototype tools with clear readiness labels.",
  path: "/laboratory",
});

export default function LaboratoryPage() {
  return (
    <ToolSectionPage
      category="creative"
      title="Creative / AI Lab"
      eyebrow="Prototype floor"
      description="Creative AI experiments and rough workbenches live here, with backend needs and review limits kept visible."
      positioning="Experimental surfaces only. Generated media and generated copy require rights checks, review, and production hardening."
      primaryToolId="ai-edit-factory"
    />
  );
}
