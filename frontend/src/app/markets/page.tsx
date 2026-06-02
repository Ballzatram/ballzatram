import type { Metadata } from "next";
import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";

export const metadata: Metadata = {
  title: "Markets | Ballzatram Daily",
  description: "The Markets desk for Quant Library stories and explainable market-analysis tools.",
};

export default function MarketsPage() {
  return <DepartmentLandingPage departmentId="quant-library" editionNote="Markets desk / Quant Library" />;
}
