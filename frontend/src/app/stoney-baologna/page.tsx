import Link from "next/link";
import type { Route } from "next";
import { stoneyProfile } from "@/config/stoney";
import { StoneyAside, StoneyQuote, StoneyStatusLine } from "@/components/stoney/StoneyPrimitives";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Stoney Baologna | Ballzatram",
  description:
    "Profile for Stoney Baologna, Ballzatram's jester AI, resident correspondent, future playable character, and current-events nuisance.",
  path: "/stoney-baologna",
});

export default function StoneyBaolognaPage() {
  return (
    <section className="min-h-dvh bg-[#efe3c2] text-[#24150b]">
      <div className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b-[3px] border-double border-[#24150b] pb-6">
          <p className="font-mono text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#7a5730]">
            Ballzatram correspondent / character framework
          </p>
          <h1 className="mt-4 font-serif text-[clamp(3.5rem,10vw,8rem)] font-black leading-[0.84] tracking-normal text-[#1b1109]">
            {stoneyProfile.displayName}
          </h1>
          <p className="mt-4 max-w-3xl font-serif text-xl font-bold leading-8 text-[#3a2312]">
            {stoneyProfile.shortBio}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <section className="border border-[#2b1b10] bg-[#f7edcf] p-5">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                Dossier
              </p>
              <h2 className="mt-2 font-serif text-4xl font-black leading-none text-[#1b1109]">
                He is here to add flavor, not replace facts.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#4b2b16]">
                Stoney is Ballzatram's jester AI and resident correspondent. He can appear in tool margins,
                newspaper sidebars, empty states, loading notes, and future games. He should never be treated as the
                source of truth for analysis, caveats, or real-world claims.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {stoneyProfile.titles.map((title) => (
                  <div key={title} className="border border-[#2b1b10] bg-[#ead9ad] p-3">
                    <span className="font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7a5730]">
                      Title
                    </span>
                    <strong className="mt-1 block font-serif text-xl leading-6">{title}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <article className="border border-[#2b1b10] bg-[#ead9ad] p-5">
                <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                  Future game file
                </p>
                <h2 className="mt-2 font-serif text-3xl font-black leading-none text-[#1b1109]">
                  Bullshit Simulator has escaped the filing cabinet.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#4b2b16]">
                  The first prototype is now a small text adventure, not a full engine. It proves the opening arc,
                  stats, choices, and Stoney's ability to make a mall emergency worse by talking.
                </p>
                <Link
                  href={"/arcade/bullshit-simulator" as Route}
                  className="mt-4 inline-flex border border-[#2b1b10] px-3 py-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]"
                >
                  Play prototype
                </Link>
              </article>
              <article className="border border-[#2b1b10] bg-[#24150b] p-5 text-[#f4e7c8]">
                <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#e3bd72]">
                  South Gate Mall note
                </p>
                <h2 className="mt-2 font-serif text-3xl font-black leading-none">
                  Survivor of the Siege, allegedly.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#d9c59a]">
                  The prototype opens the Siege of South Gate Mall. The expanded mall, factions, and deeper systems
                  remain future narrative/game material.
                </p>
              </article>
            </section>

            <section className="border border-[#2b1b10] bg-[#f7edcf] p-5">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                How he is allowed to talk
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {stoneyProfile.toneRules.map((rule) => (
                  <p key={rule} className="border-t border-[#2b1b10] pt-3 text-sm leading-6 text-[#4b2b16]">
                    {rule}
                  </p>
                ))}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <StoneyAside
              title="Correspondent status: unsupervised, technically."
              body="Stoney can make the margin louder, but the editor still owns the facts."
              tone="amber"
            />
            <StoneyQuote quote="I have not been wrong. I have been temporarily betrayed by reality." tone="paper" />
            <StoneyStatusLine label="Playable status" line="Future character. Current nuisance." tone="paper" />
            <section className="border border-[#2b1b10] bg-[#ead9ad] p-5">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                Playable links
              </p>
              <Link
                href={"/arcade/bullshit-simulator" as Route}
                className="mt-3 inline-flex border border-[#2b1b10] px-3 py-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]"
              >
                Open Bullshit Simulator
              </Link>
              <Link
                href={"/games/stoney-bologna/index.html" as Route}
                className="mt-3 inline-flex border border-[#2b1b10] px-3 py-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]"
              >
                Open legacy Stoney route
              </Link>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}
