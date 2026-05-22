import type { Metadata } from "next";
import { PenitentFolio } from "@/components/penitent/PenitentFolio";

export const metadata: Metadata = {
  title: "Hymns | The Penitent Manuscript",
  description: "Songs, chants, and sacred noise from the Penitent world.",
};

export default function Page() {
  return (
    <PenitentFolio
      title="Hymns"
      kicker="Songs and sacred noise"
      image="/pntnt2/assets/penitent_jam.png"
      imageAlt="The Penitent recording session"
    >
      <p>
        Tracks, lyrics, loops, and forbidden refrains will gather here. In this world, songs are maps,
        weapons, prayers, and the hinges of hidden doors.
      </p>
      <p>
        The first playable hymn has already escaped into the rhythm combat folio.
      </p>
    </PenitentFolio>
  );
}
