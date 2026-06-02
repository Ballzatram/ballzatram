import type { Metadata } from "next";
import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";

export const metadata: Metadata = {
  title: "Betting | Ballzatram Daily",
  description: "Bettor's Corner placeholder for probability lessons and paper-mode betting education.",
};

export default function BettingPage() {
  return <DepartmentLandingPage departmentId="bettors-corner" editionNote="Betting desk / placeholder" />;
}
