import { EconDomProgressTracker } from "@/components/econ-arcade/EconDomProgressTracker";
import { InvisibleHandsPage } from "@/components/invisible-hands/InvisibleHandsPage";

export default function Page() {
  return <>
    <EconDomProgressTracker
      gameId="invisible-hands"
      completionText="Campaign resolution"
      concepts={["systems thinking", "policy tradeoffs", "credibility", "trade retaliation", "second-order effects"]}
    />
    <InvisibleHandsPage />
  </>;
}
