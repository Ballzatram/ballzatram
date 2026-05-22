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
      tone: "blood",
    },
    {
      title: "Econ Arcade",
      kicker: "Playable systems",
      copy:
        "Economics survives here as games, pressure chambers, strange markets, and simulations with teeth.",
      href: "/econ-arcade",
      cta: "Enter the arcade",
      tone: "lapis",
    },
    {
      title: "Macro Board",
      kicker: "Workshop instrument",
      copy:
        "A brass-and-chalk machine for market questions. Useful, but no longer the front door to the universe.",
      href: "/macro-board",
      cta: "Open the instrument",
      tone: "verdigris",
    },
    {
      title: "Weather Desk",
      kicker: "Storm glass",
      copy:
        "Forecasts, market weather, and paper-mode rituals for watching pressure systems move through the world.",
      href: "/weather-bot.html",
      cta: "Read the storm",
      tone: "sky",
    },
  ];

  const archiveItems = [
    "Outlaw hymns recorded between eras",
    "Playable pages, hidden relics, and demon encounters",
    "Workshop machines that think quietly behind the walls",
    "Lore fragments from Ballzatram's other lives",
  ];

  return (
    <div className="ballzatram-home">
      <section className="ballzatram-hero" aria-labelledby="home-title">
        <div className="ballzatram-hero__copy">
          <p className="ballzatram-kicker">Wandering inventor - outlaw bard - keeper of playable artifacts</p>
          <h1 id="home-title">Ballzatram</h1>
          <p className="ballzatram-hero__text">
            A retro-futurist traveler moves through eras with a guitar, a sack of impossible machinery,
            and a growing archive of games, music, manuscripts, simulations, and strange worlds.
          </p>
          <div className="ballzatram-trust-row" aria-label="Ballzatram world markers">
            <span>Games first</span>
            <span>Songs as keys</span>
            <span>Hidden manuscripts</span>
          </div>
          <div className="ballzatram-actions" aria-label="Primary paths">
            <Link href={"/penitent" as Route} className="ballzatram-button ballzatram-button--gold">
              Discover the manuscript
            </Link>
            <a href="#arcade" className="ballzatram-button ballzatram-button--ink">
              Browse the archive
            </a>
          </div>
        </div>
        <div className="ballzatram-hero__figure" aria-hidden="true">
          <img src="/assets/ballzatram.png" alt="" />
        </div>
      </section>

      <section id="arcade" className="ballzatram-section" aria-labelledby="arcade-title">
        <div className="ballzatram-section__heading">
          <p className="ballzatram-kicker">Playable archive</p>
          <h2 id="arcade-title">Worlds, relics, and machines</h2>
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
              <b>{door.cta}</b>
            </Link>
          ))}
        </div>
      </section>

      <section id="music" className="ballzatram-band ballzatram-band--music" aria-labelledby="music-title">
        <div>
          <p className="ballzatram-kicker">Music</p>
          <h2 id="music-title">Songs as maps, spells, and battle engines</h2>
        </div>
        <p>
          Ballzatram's music belongs beside the games: outlaw ballads, haunted hymns, arcade chants,
          ritual loops, and melodies that open doors when played in the right room.
        </p>
        <Link href={"/penitent/hymns" as Route} className="ballzatram-text-link">
          Visit the hymn folio
        </Link>
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

      <section id="lore" className="ballzatram-band ballzatram-band--lore" aria-labelledby="lore-title">
        <div>
          <p className="ballzatram-kicker">Lore</p>
          <h2 id="lore-title">A character scattered across time</h2>
        </div>
        <p>
          Rocketeer, Wild West fugitive, traveling musician, winter myth, roadside engineer.
          Ballzatram keeps returning with different instruments and the same dangerous curiosity.
        </p>
      </section>
    </div>
  );
}
