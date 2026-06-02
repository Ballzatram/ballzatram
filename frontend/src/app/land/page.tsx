import { DepartmentLandingPage } from "@/components/newspaper/DepartmentLandingPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Land | Ballzatram Daily",
  description: "The Land desk for Parcel diligence, infrastructure notes, and source-labeled site memos.",
  path: "/land",
});

export default function LandPage() {
  return <DepartmentLandingPage departmentId="parcel" editionNote="Land desk / Parcel" />;
}
