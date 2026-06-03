import { ParcelIntelligencePage } from "@/components/parcel/ParcelIntelligencePage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Parcel Intelligence | Ballzatram",
  description:
    "Source-labeled land research workspace for messy parcel leads, listing links, development theses, shortlists, caveats, and memo previews.",
  path: "/land",
});

export default function LandPage() {
  return <ParcelIntelligencePage />;
}
