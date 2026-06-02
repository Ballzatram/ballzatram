import type { Metadata } from "next";
import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";

export const metadata: Metadata = {
  title: "Laboratory | Ballzatram Daily",
  description: "The Laboratory desk for experimental tools, AI edit drafts, prototypes, and process notes.",
};

export default function LaboratoryPage() {
  return <DepartmentLandingPage departmentId="laboratory" editionNote="Laboratory desk / prototypes" />;
}
