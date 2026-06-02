import { ToolSectionPage } from "@/components/launchpad/ToolSectionPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Games & Simulations | Ballzatram",
  description: "Playable simulations, economics labs, game-theory tools, and experimental Ballzatram games.",
  path: "/arcade",
});

export default function ArcadePage() {
  return (
    <ToolSectionPage
      category="games"
      title="Games & Simulations"
      eyebrow="Playable systems"
      description="A cabinet of economics labs, learning games, policy toys, and experimental playable worlds."
      positioning="Live, static, and experimental games are labeled separately so users know what is polished, old, or rough."
      primaryToolId="econ-arcade"
    />
  );
}
