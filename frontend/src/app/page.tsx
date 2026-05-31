import Link from "next/link";
import type { Route } from "next";

export default function Home() {
  const worldDoors = [
    {
      title: "The Penitent 2",
      copy:
        "A sealed medieval page that remembers an older lifetime. Brush away the ash and enter the cursed playable text.",
      href: "/penitent",
      cta: "Unseal the page (scratch to reveal)",
      tone: "manuscript",
    },
    {
      title: "Econ Arcade",
      copy:
        "Economics survives here as games, pressure chambers, strange markets, and simulations with teeth.",
      href: "/econ-arcade",
      cta: "Open Econ Arcade",
      tone: "arcade",
    },
    {
      title: "Macro Board",
      copy:
        "A brass-and-chalk machine for market questions. Useful, but no longer the front door to the universe.",
      href: "/macro-board",
      cta: "Open Macro Board",
      tone: "instrument",
    },
    {
      title: "Weather Desk",
      copy:
        "Forecasts, market weather, and paper-mode rituals for watching pressure systems move through the world.",
      href: "/weather-bot.html",
      cta: "Open Weather Desk",
      tone: "weather",
    },
    {
      title: "Parcel",
      copy:
        "A land-search contraption for turning a rough thesis into source-aware leads, caveats, and diligence questions.",
      href: "/tools/parcel/index.html",
      cta: "Launch Parcel",
      tone: "parcel",
    },
    {
      title: "AI Edit",
      copy:
        "A rights-approved media toy for shaping short-form edit recipes and rendering clips when the backend is awake.",
      href: "/ai-edit-factory/",
      cta: "Open AI Edit",
      tone: "edit",
    },
  ];

  return (
    <div className="ballzatram-home">
      <section className="ballzatram-hero" aria-labelledby="home-title">
        <div className="ballzatram-hero__copy">
          <h1 id="home-title" className="ballzatram-visually-hidden">Ballzatram</h1>
          <p className="ballzatram-kicker">Wandering Inventor - Outlaw Bard - Keeper of Jenky Artifacts</p>
          <p className="ballzatram-hero__text">
            I am just drifting around through the eras, sharing my personal bag of gimmicks, games,
            and tools I think are cool. Some are useful, some are strange, and some are mostly here
            because I could not stop thinking about them.
          </p>
        </div>
        <div className="ballzatram-hero__figure" aria-hidden="true">
          <img src="/assets/ballzatram.png" alt="" />
        </div>
      </section>

      <section id="work-shop" className="ballzatram-section" aria-labelledby="work-shop-title">
        <div className="ballzatram-section__heading">
          <p className="ballzatram-kicker">Work Shop</p>
          <h2 id="work-shop-title">Games, Gimmicks, and Weird Little Tools</h2>
        </div>
        <div className="ballzatram-door-grid">
          {worldDoors.map((door) => (
            <Link
              key={door.title}
              href={door.href as Route}
              className={`ballzatram-door ballzatram-door--${door.tone}`}
            >
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
