import type { Metadata } from "next";
import { RhythmCombat } from "@/components/penitent/RhythmCombat";

export const metadata: Metadata = {
  title: "Penitent 2: Rhythm Crusade | The Penitent Manuscript",
  description: "A playable rhythm battle prototype inside the Penitent world.",
};

export default function Page() {
  return <RhythmCombat />;
}
