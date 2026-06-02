import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Arcade | Ballzatram Daily",
  description: "The Arcade desk for playable simulations, economics labs, and game-shaped learning systems.",
  path: "/arcade",
});

export default function ArcadePage() {
  return <DepartmentLandingPage departmentId="arcade" editionNote="Arcade desk / playable cabinet" />;
}
