import type { Metadata, Viewport } from "next";
import { RhythmCombat } from "@/components/penitent/RhythmCombat";

export const metadata: Metadata = {
  title: "Penitent 2: Rhythm Crusade | The Penitent Manuscript",
  description: "A playable rhythm battle prototype inside the Penitent world.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090704",
};

export default function Page() {
  return <RhythmCombat />;
}
