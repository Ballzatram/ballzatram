import type { Metadata } from "next";
import { RhythmCombat } from "@/components/penitent/RhythmCombat";

export const metadata: Metadata = {
  title: "Rhythm Crusade | The Penitent Manuscript",
  description: "A browser rhythm-combat prototype inside the Penitent world.",
};

export default function Page() {
  return <RhythmCombat />;
}
