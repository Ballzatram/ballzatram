import Link from "next/link";
import type { Route } from "next";

export default function Home() {
  const worldDoors = [
    {
      title: "The Penitent Manuscript",
      kicker: "Discovered relic",
      copy:
        "A sealed medieval page that remembers an older lifetime. Brush away the ash and enter the cursed playable text.",
      href: "/penitent",
      cta: "Unseal the page",
      tone: "manuscript",
    },
    {
      title: "Econ Arcade",
      kicker: "Game cabinet",
      copy:
        "Economics survives here as games, pressure chambers, strange markets, and simulations with teeth.",
      href: "/econ-arcade",
      cta: "Open Econ Arcade",
      tone: "lapis",
    },
    {
      title: "Macro Board",
      kicker: "Workshop instrument",
      copy:
        "A brass-and-chalk machine for market questions. Useful, but no longer the front door to the universe.",
      href: "/macro-board",
      cta: "Open Macro Board",
      tone: "verdigris",
    },
    {
      title: "Weather Desk",
      kicker: "Storm glass",
      copy:
        "Forecasts, market weather, and paper-mode rituals for watching pressure systems move through the world.",
      href: "/weather-bot.html",
      cta: "Open Weather Desk",
      tone: "sky",
    },
  ];

  const archiveItems = [
    "Playable systems and cabinet experiments",
    "Manuscript relics and hidden pages",
    "Workshop machines that think quietly behind the walls",
    "Field notes from Ballzatram's other lives",
  ];

  return (
    <div className="ballzatram-home">
      <section className="ballzatram-hero" aria-labelledby="home-title">
        <div className="ballzatram-hero__copy">
          <p className="ballzatram-kicker">Wandering inventor - outlaw bard - keeper of playable artifacts</p>
          <h1 id="home-title">Ballzatram</h1>
          <p className="ballzatram-hero__text">
            A retro-futurist traveler moves through eras with a sack of impossible machinery,
            strange games, buried manuscripts, simulations, and worlds that behave like artifacts.
          </p>
          <div className="ballzatram-trust-row" aria-label="Ballzatram world markers">
            <span>Games first</span>
            <span>Strange tools</span>
            <span>Hidden manuscripts</span>
          </div>
          <div className="ballzatram-actions" aria-label="Primary paths">
            <Link href={"/penitent" as Route} className="ballzatram-button ballzatram-button--gold">
              Discover the manuscript
            </Link>
            <a href="#toolbox" className="ballzatram-button ballzatram-button--ink">
              Open the toolbox
            </a>
          </div>
        </div>
        <div className="ballzatram-hero__figure" aria-hidden="true">
          <img src="/assets/ballzatram.png" alt="" />
        </div>
      </section>

      <section id="toolbox" className="ballzatram-section" aria-labelledby="toolbox-title">
        <div className="ballzatram-section__heading">
          <p className="ballzatram-kicker">Toolbox</p>
          <h2 id="toolbox-title">Games, relics, and machines</h2>
        </div>
        <div className="ballzatram-door-grid">
          {worldDoors.map((door) => (
            <Link
              key={door.title}
              href={door.href as Route}
              className={`ballzatram-door ballzatram-door--${door.tone}`}
            >
              <span>{door.kicker}</span>
              <h3>{door.title}</h3>
              <p>{door.copy}</p>
              <b>
                {door.cta}
                <i aria-hidden="true">&gt;</i>
              </b>
            </Link>
          ))}
        </div>
      </section>

      <section id="workshop" className="ballzatram-section ballzatram-workshop" aria-labelledby="workshop-title">
        <div className="ballzatram-section__heading">
          <p className="ballzatram-kicker">Workshop</p>
          <h2 id="workshop-title">The machinery stays behind the magic</h2>
        </div>
        <div className="ballzatram-workshop__grid">
          {archiveItems.map((item) => (
            <article key={item}>
              <span aria-hidden="true">*</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="lore" className="ballzatram-lore-teaser" aria-labelledby="lore-title">
        <div>
          <p className="ballzatram-kicker">Lore</p>
          <h2 id="lore-title">Field notes, not canon yet</h2>
        </div>
        <p>
          Ballzatram has lived in several shapes. The lore needs its own treatment, so this marker stays quiet
          until the map, eras, and mythology are ready to hold weight.
        </p>
      </section>
    </div>
  );
}
