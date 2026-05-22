import type { Metadata } from "next";
import { PenitentFolio } from "@/components/penitent/PenitentFolio";

export const metadata: Metadata = {
  title: "Relics | The Penitent Manuscript",
  description: "Artifacts, hidden objects, and future playable pages from the Penitent world.",
};

export default function Page() {
  return (
    <PenitentFolio
      title="Relics"
      kicker="Artifacts and marginalia"
      image="/pntnt2/assets/relic_merch.png"
      imageAlt="Penitent relics and artifact display"
      actionHref="/penitent/rhythm"
      actionLabel="Enter rhythm crusade"
    >
      <p>
        Relics are not inventory items yet. They are promises: demon marginalia, playable scripture,
        hidden scraps of Ballzatram's forgotten era, and artifacts that may wake up when a song is played.
      </p>
      <p>
        Future pages can branch from this folio without disturbing the preserved PNTNT2 manuscript.
      </p>
    </PenitentFolio>
  );
}
