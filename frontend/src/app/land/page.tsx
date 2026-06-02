import { ParcelIntelligencePage } from "@/components/parcel/ParcelIntelligencePage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Parcel Intelligence | Ballzatram",
  description:
    "AI-guided land acquisition research for messy parcel leads, listing links, development theses, source quality, shortlists, and memo previews.",
  path: "/land",
});

export default function LandPage() {
  return <ParcelIntelligencePage />;
}
