import { ToolSectionPage } from "@/components/launchpad/ToolSectionPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Land Desk | Ballzatram",
  description: "AI-guided land acquisition research workflows, centered on the Parcel Intelligence prototype.",
  path: "/land",
});

export default function LandPage() {
  return (
    <ToolSectionPage
      category="land"
      title="Land Desk"
      eyebrow="Land & Real Estate"
      description="Parcel Intelligence is a guided research workflow for land acquisition questions, shortlists, and memo-style previews."
      positioning="Prototype / research workflow. Do not treat outputs as verified acquisition advice."
      primaryToolId="parcel-intelligence"
    />
  );
}
