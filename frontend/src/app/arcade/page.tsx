import type { Metadata } from "next";
import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";

export const metadata: Metadata = {
  title: "Arcade | Ballzatram Daily",
  description: "The Arcade desk for playable simulations, economics labs, and game-shaped learning systems.",
};

export default function ArcadePage() {
  return <DepartmentLandingPage departmentId="arcade" editionNote="Arcade desk / playable cabinet" />;
}
