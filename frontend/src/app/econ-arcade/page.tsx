import { EconArcadePage } from "@/components/econ-arcade/EconArcadePage";
import { EconArcadeProgressPanel } from "@/components/econ-arcade/EconArcadeProgressPanel";

export default function Page() {
  return <div className="space-y-6">
    <EconArcadeProgressPanel />
    <EconArcadePage />
  </div>;
}
