import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Laboratory | Ballzatram Daily",
  description: "The Laboratory desk for experimental tools, AI edit drafts, prototypes, and process notes.",
  path: "/laboratory",
});

export default function LaboratoryPage() {
  return <DepartmentLandingPage departmentId="laboratory" editionNote="Laboratory desk / prototypes" />;
}
