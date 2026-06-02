import type { Metadata } from "next";
import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";

export const metadata: Metadata = {
  title: "Culture | Ballzatram Daily",
  description: "The Culture desk for Penitent II devlogs, playable manuscript notes, and Ballzatram artifacts.",
};

export default function CulturePage() {
  return <DepartmentLandingPage departmentId="culture" editionNote="Culture desk / artifacts" />;
}
