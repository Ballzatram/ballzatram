import { BallzatramLaunchpad } from "@/components/launchpad/BallzatramLaunchpad";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Devin Gallemore | A digital frontier",
  description:
    "An independent outpost for curious minds. Tools, economics games, AI experiments, and projects by Devin Gallemore.",
  path: "/",
});

export default function Home() {
  return <BallzatramLaunchpad />;
}
