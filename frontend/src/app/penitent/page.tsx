import type { Metadata } from "next";
import { PenitentGate } from "@/components/penitent/PenitentGate";

export const metadata: Metadata = {
  title: "The Penitent 2 | Ballzatram",
  description: "A sealed playable relic from a forgotten Ballzatram lifetime.",
};

export default function Page() {
  return <PenitentGate />;
}
