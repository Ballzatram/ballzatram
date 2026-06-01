import Link from "next/link";
import type { Route } from "next";

type FrontPageColumn = {
  title: string;
  desk: string;
  status: string;
  copy: string;
  href: Route;
  cta: string;
  tone: "parcel" | "macro" | "stoney";
  byline: string;
};

type ArchiveClip = {
  title: string;
  stamp: string;
  labels: string[];
  copy: string;
  href: Route;
  tone: "manuscript" | "arcade" | "strategy" | "policy" | "weather" | "edit";
};

const frontPageColumns: FrontPageColumn[] = [
  {
    title: "Parcel",
    desk: "The Land Desk",
    status: "Active Prototype",
    copy:
      "A due-diligence report machine for parcels, zoning mysteries, development hunches, caveats, and broker questions.",
    href: "/tools/parcel/index.html" as Route,
    cta: "Launch Parcel",
    tone: "parcel",
    byline: "By the Zoning Caveat Department",
  },
  {
    title: "MacroBoard",
    desk: "The Markets Page",
    status: "Active Prototype",
    copy:
      "A plain-English portfolio and macro scenario desk for understanding what you own, what can hurt you, and what the market is yelling about.",
    href: "/macro-board" as Route,
    cta: "Open MacroBoard",
    tone: "macro",
    byline: "By the Scenario Desk",
  },
  {
    title: "Stoney Bologna's Bullshit Simulator 7",
    desk: "Police Blotter Serial",
    status: "Playable Oddity",
    copy:
      "Yuma's least-qualified police chief attempts to bluff through a hostage crisis at South Gate Mall without letting the cameras realize he has no idea what he is doing.",
    href: "/games/stoney-bologna/index.html" as Route,
    cta: "Read the Blotter",
    tone: "stoney",
    byline: "Yuma dispatch, mall desk",
  },
];

const archiveClips: ArchiveClip[] = [
  {
    title: "The Penitent 2",
    stamp: "Back Issue",
    labels: ["Playable Archive", "Prototype Relic"],
    copy:
      "A playable manuscript relic with hymns, crusades, and suspiciously dramatic marginalia. Off the front page, not buried.",
    href: "/penitent" as Route,
    tone: "manuscript",
  },
  {
    title: "Econ Arcade",
    stamp: "Back Issue",
    labels: ["Playable Archive"],
    copy:
      "Economics games, simulations, and learning cabinets filed together for readers who like curves with buttons on them.",
    href: "/econ-arcade" as Route,
    tone: "arcade",
  },
  {
    title: "Strategy Studio",
    stamp: "Back Issue",
    labels: ["Playable Archive"],
    copy:
      "A game-theory curriculum map of bargaining, auctions, repeated games, and rational-choice machinery.",
    href: "/legacy-econ-arcade/platform.html" as Route,
    tone: "strategy",
  },
  {
    title: "Central Banker",
    stamp: "Playable Archive",
    labels: ["Prototype Relic"],
    copy:
      "A fictional policy desk for shocks, inflation pressure, credibility, dashboards, and end-of-term debriefs.",
    href: "/games/central-bank.html" as Route,
    tone: "policy",
  },
  {
    title: "Weather Desk",
    stamp: "Under Review",
    labels: ["Back Issue", "Under Review"],
    copy:
      "Paper-mode weather-market worksheets with settlement reminders and no live-trading wire hidden behind the curtain.",
    href: "/weather-bot.html" as Route,
    tone: "weather",
  },
  {
    title: "AI Edit",
    stamp: "Requires Backend",
    labels: ["Requires Backend", "Prototype Relic"],
    copy:
      "A rights-approved edit factory that still needs its worker path awake before it can behave like a production machine.",
    href: "/ai-edit-factory/" as Route,
    tone: "edit",
  },
];

export default function Home() {
  return (
    <div className="ballzatram-home newspaper-home">
      <section className="paper-masthead" aria-labelledby="home-title">
        <div className="paper-masthead__copy">
          <p className="ballzatram-kicker">Hangar edition // useful machines // playable reports</p>
          <h1 id="home-title" className="paper-nameplate">
            <img src="/assets/title.png" alt="Ballzatram" />
          </h1>
          <p className="paper-subtitle">
            A strange workshop paper of useful machines, playable reports, and public nonsense.
          </p>
          <div className="issue-strip" aria-label="Issue metadata">
            <span>Vol. 1</span>
            <span>Issue 7</span>
            <span>Filed from the hangar</span>
            <span>Early access edition</span>
          </div>
          <p className="ballzatram-hero__text">
            Ballzatram is still the same blue-sky workshop: part living lab, part tool bench, part rocketeer incident report. The front page is narrower now, so the active machines get room to breathe and the archive can stay weird without pretending everything is equally done.
          </p>
          <p className="ballzatram-hero__text">
            Some dispatches are useful. Some are playable. Some are only safe if you read the label. The paper prints the label.
          </p>
          <div className="ballzatram-trust-row" aria-label="Site quality markers">
            <span>Active prototypes marked plainly</span>
            <span>No fake polish</span>
            <span>Archive intact</span>
          </div>
          <div className="ballzatram-actions">
            <Link className="ballzatram-button ballzatram-button--gold" href={"/#front-page" as Route}>Read the Front Page</Link>
            <Link className="ballzatram-button ballzatram-button--ink" href={"/games/stoney-bologna/index.html" as Route}>Open Police Blotter</Link>
            <Link className="ballzatram-button ballzatram-button--ink" href={"/#back-issues" as Route}>Visit the Morgue</Link>
          </div>
        </div>
        <div className="ballzatram-hero__figure paper-rocketeer" aria-hidden="true">
          <img src="/assets/ballzatram.png" alt="" />
        </div>
      </section>

      <section className="ballzatram-band editorial-standards" aria-labelledby="standards-title">
        <div>
          <p className="ballzatram-kicker">Editorial standards</p>
          <h2 id="standards-title">A workshop can be rough and still print corrections.</h2>
        </div>
        <p>
          Every machine gets a readable label: active prototype, playable oddity, back issue, backend-required, or under review. Older experiments are not erased; they move to clippings, back issues, and relic drawers when they are not leading the paper.
        </p>
      </section>

      <section id="front-page" className="ballzatram-section front-page-section" aria-labelledby="front-page-title">
        <div className="ballzatram-section__heading">
          <p className="ballzatram-kicker">Today's columns</p>
          <h2 id="front-page-title">Front Page Desk</h2>
        </div>
        <div className="front-page-grid" aria-label="Active Ballzatram columns">
          <article className="lead-dispatch">
            <span className="dispatch-stamp">Filed 07:13 from Hangar B</span>
            <h2>The living lab narrows the front page.</h2>
            <p>
              Three columns are currently above the fold: land diligence, macro risk, and one mall-police fiasco preserved as a playable report.
            </p>
          </article>

          <article className="classified-note">
            <span className="dispatch-stamp">Classified</span>
            <h3>Wanted: better questions.</h3>
            <p>Bring zoning mysteries, portfolio anxieties, broker riddles, and public nonsense. Ballzatram will assemble a machine and label the loose bolts.</p>
          </article>

          {frontPageColumns.map((column) => (
            <Link
              key={column.title}
              href={column.href}
              className={`dispatch-card dispatch-card--${column.tone}`}
            >
              <div className="dispatch-card__topline">
                <span className="dispatch-label">{column.desk}</span>
                <span className="tool-status experimental">{column.status}</span>
              </div>
              <h3>{column.title}</h3>
              <p className="byline">{column.byline}</p>
              <p>{column.copy}</p>
              <b>
                {column.cta}
                <i aria-hidden="true">&gt;</i>
              </b>
            </Link>
          ))}
        </div>
      </section>

      <section id="back-issues" className="ballzatram-section archive-section" aria-labelledby="archive-title">
        <div className="ballzatram-section__heading">
          <p className="ballzatram-kicker">Back Issues / The Morgue</p>
          <h2 id="archive-title">Clippings Still Breathing</h2>
        </div>
        <div className="archive-grid" aria-label="Archived Ballzatram experiments">
          {archiveClips.map((clip) => (
            <Link key={clip.title} href={clip.href} className={`archive-card archive-card--${clip.tone}`}>
              <span className="archive-stamp">{clip.stamp}</span>
              <h3>{clip.title}</h3>
              <p>{clip.copy}</p>
              <div className="archive-labels">
                {clip.labels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <b>Open clipping</b>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
