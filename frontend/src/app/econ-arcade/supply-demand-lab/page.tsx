import { EconDomProgressTracker } from "@/components/econ-arcade/EconDomProgressTracker";
import { SupplyDemandExperience } from "@/components/econ-arcade/SupplyDemandExperience";

export default function Page() {
  return <>
    <EconDomProgressTracker
      gameId="supply-demand-lab"
      completionText="Objective achieved"
      concepts={["equilibrium", "supply and demand", "surplus", "deadweight loss", "price controls"]}
    />
    <SupplyDemandExperience />
  </>;
}
