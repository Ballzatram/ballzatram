import type { Metadata } from "next";
import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";

export const metadata: Metadata = {
  title: "Land | Ballzatram Daily",
  description: "The Land desk for Parcel diligence, infrastructure notes, and source-labeled site memos.",
};

export default function LandPage() {
  return <DepartmentLandingPage departmentId="parcel" editionNote="Land desk / Parcel" />;
}
