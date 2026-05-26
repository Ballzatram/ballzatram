import Link from "next/link";
import type { Route } from "next";

export default function Home() {
  const worldDoors = [
    {
      title: "The Penitent 2",
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
      tone: "arcade",
    },
    {
      title: "Macro Board",
      kicker: "Workshop instrument",
      copy:
        "A brass-and-chalk machine for market questions. Useful, but no longer the front door to the universe.",
      href: "/macro-board",
      cta: "Open Macro Board",
      tone: "instrument",
    },
    {
      title: "Weather Desk",
      kicker: "Storm glass",
      copy:
        "Forecasts, market weather, and paper-mode rituals for watching pressure systems move through the world.",
      href: "/weather-bot.html",
      cta: "Open Weather Desk",
      tone: "weather",
    },
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
            <a href="#work-shop" className="ballzatram-button ballzatram-button--ink">
              Open the Work Shop
            </a>
          </div>
        </div>
        <div className="ballzatram-hero__figure" aria-hidden="true">
          <img src="/assets/ballzatram.png" alt="" />
        </div>
      </section>

      <section id="work-shop" className="ballzatram-section" aria-labelledby="work-shop-title">
        <div className="ballzatram-section__heading">
          <p className="ballzatram-kicker">Work Shop</p>
          <h2 id="work-shop-title">Games, relics, and other oddities</h2>
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
    </div>
  );
}
