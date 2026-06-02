import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Markets | Ballzatram Daily",
  description: "The Markets desk for Quant Library stories and explainable market-analysis tools.",
  path: "/markets",
});

export default function MarketsPage() {
  return <DepartmentLandingPage departmentId="quant-library" editionNote="Markets desk / Quant Library" />;
}
