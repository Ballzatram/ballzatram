import { ToolSectionPage } from "@/components/launchpad/ToolSectionPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Archive / Oddities | Ballzatram",
  description: "Older Ballzatram pages, lore, story shells, betting education, and strange unfinished experiments.",
  path: "/archive",
});

export default function ArchivePage() {
  return (
    <ToolSectionPage
      category="archive"
      title="Archive / Oddities"
      eyebrow="Back room"
      description="Strange experiments, art, lore, older pages, and unfinished ideas are collected here so the launchpad stays clear."
      positioning="Experimental / archive. These routes remain visible, but they are not the core public identity."
      primaryToolId="penitent"
    />
  );
}
