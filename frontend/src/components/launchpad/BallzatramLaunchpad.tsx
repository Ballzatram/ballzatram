import Link from "next/link";
import type { Route } from "next";
import { getToolsForCategory, launchpadSections } from "@/config/toolCatalog";
import { ToolCard } from "@/components/launchpad/ToolCard";

function Icon({ name }: { name: string }) {
  return <svg className="pixel-icon" aria-hidden="true"><use href={`/assets/frontier/icons.svg#${name}`} /></svg>;
}

export function BallzatramLaunchpad() {
  return (
    <>
      <section className="frontier-hero" aria-labelledby="welcome-title">
        <img className="frontier-scene" src="/assets/frontier/sunset.svg" alt="" width="480" height="232" fetchPriority="high" />
        <div className="hero-copy">
          <p className="frontier-kicker">An independent outpost on the internet</p>
          <h1 id="welcome-title">HOWDY,<span>I’M DEVIN.</span></h1>
          <p className="hero-description">I build tools, games, and the occasional rabbit hole. A little finance. A little AI. A whole lot of curiosity.</p>
          <div className="hero-actions"><a className="pixel-button" href="#programs">Explore the projects <Icon name="arrow" /></a><a className="text-link" href="/devin/">Meet the cowboy ↗</a></div>
        </div>
        <div className="hero-stamp" aria-hidden="true">OPEN RANGE.<br />OPEN MIND.</div>
        <div className="hero-footer"><span><Icon name="star" /> Side quests encouraged.</span><span className="hero-coordinates">Est. with curiosity / 8-bit edition</span></div>
      </section>
      <div className="frontier-intro"><div><strong>Welcome to my little corner of the frontier.</strong><p>Part workshop. Part arcade. Always something worth poking around in.</p></div><span className="intro-mark"><Icon name="cactus" /> Built with a wandering mind.</span></div>
      <section className="frontier-trails" aria-labelledby="trails-title">
        <div className="section-heading"><div><p className="frontier-kicker">01 / Choose your adventure</p><h2 id="trails-title">Pick your trail.</h2></div><p>Three good places to start.</p></div>
        <div className="trail-grid">
          <Link className="trail-card" href={"/arcade" as Route}><div className="trail-top"><Icon name="game" /><span>TRAIL 01</span></div><h3>The Arcade</h3><p>Run an economy. Test a strategy. Learn a thing or two.</p><span className="trail-arrow" aria-hidden="true">↗</span></Link>
          <a className="trail-card" href="/tools/observatory/index.html"><div className="trail-top"><Icon name="book" /><span>TRAIL 02</span></div><h3>The Paper Trail</h3><p>Follow the bills. Inspect the records. Ask better questions.</p><span className="trail-arrow" aria-hidden="true">↗</span></a>
          <a className="trail-card" href="/tools/ai/index.html"><div className="trail-top"><Icon name="bulb" /><span>TRAIL 03</span></div><h3>The AI Outpost</h3><p>Meet Osiris. Explore the experiments. Bring your own AI.</p><span className="trail-arrow" aria-hidden="true">↗</span></a>
        </div>
      </section>
      <div id="programs">
        <div className="section-heading"><div><p className="frontier-kicker">02 / The whole collection</p><h2>The project board.</h2></div><p>A few finished things. A few wild ideas.</p></div>
        {launchpadSections.map(section => <section key={section.id} className="next-frontier-section" id={`${section.id}-section`}>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
          <div className="next-frontier-grid">{getToolsForCategory(section.id).map(tool => <ToolCard key={tool.id} tool={tool} compact />)}</div>
        </section>)}
      </div>
      <section className="campfire-note" aria-labelledby="ai-title"><Icon name="bulb" /><div><h2 id="ai-title">Your AI. Your trusty sidekick.</h2><p>Use supported projects with the AI app you already have. Choose the context to share, then continue in your app. The connection guide explains interactive tools and their availability.</p></div><a className="pixel-button" href="/tools/ai/connect.html">Read the AI guide <Icon name="arrow" /></a></section>
      <footer className="frontier-footer"><span className="footer-credit"><Icon name="hat" /> Built by Devin Gallemore. Happy trails.</span><nav aria-label="Footer"><Link href={"/archive" as Route}>Archive</Link><a href="/lab-pass.html">Lab Pass</a><a href="/community.html">Community</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></nav></footer>
    </>
  );
}
