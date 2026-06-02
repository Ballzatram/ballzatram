import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Culture | Ballzatram Daily",
  description: "The Culture desk for Penitent II devlogs, playable manuscript notes, and Ballzatram artifacts.",
  path: "/culture",
});

export default function CulturePage() {
  return <DepartmentLandingPage departmentId="culture" editionNote="Culture desk / artifacts" />;
}
