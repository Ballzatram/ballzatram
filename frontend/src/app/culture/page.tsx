import { ToolSectionPage } from "@/components/launchpad/ToolSectionPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Culture & Oddities | Ballzatram",
  description: "Archive and oddity routes for Penitent II, culture pages, story shells, and strange prototypes.",
  path: "/culture",
});

export default function CulturePage() {
  return (
    <ToolSectionPage
      category="archive"
      title="Culture & Oddities"
      eyebrow="Archive"
      description="Older creative artifacts, lore surfaces, and newspaper remnants stay findable here without dominating the homepage."
      positioning="Experimental / archive. These pages are kept for exploration and context, not as finished product surfaces."
      primaryToolId="penitent"
    />
  );
}
