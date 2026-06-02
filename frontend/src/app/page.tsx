import { BallzatramLaunchpad } from "@/components/launchpad/BallzatramLaunchpad";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Ballzatram | Tool Launchpad",
  description:
    "A clean launchpad for Ballzatram's AI-guided workbenches, simulations, games, and strange little tools.",
  path: "/",
});

export default function Home() {
  return <BallzatramLaunchpad />;
}
