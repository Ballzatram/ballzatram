import Link from "next/link";
import type { Route } from "next";
import { getToolsForCategory, launchpadSections } from "@/config/toolCatalog";
import { ToolCard } from "@/components/launchpad/ToolCard";

export function BallzatramLaunchpad() {
  return (
    <div className="next-launchpad95">
      <section className="window95">
        <div className="title95"><span className="window-label">Welcome to Ballzatram</span></div>
        <div className="welcome-content95">
          <div className="welcome-copy95">
            <p className="eyebrow95">A playground for curious minds</p>
            <h1>Big ideas.<span>Small programs.</span></h1>
            <p>Part laboratory. Part arcade. A collection of things I’m building to make economics, research, and a few odd ideas worth exploring.</p>
            <div className="welcome-actions95"><a className="btn95 primary" href="#programs">Explore programs →</a><a className="btn95" href="/devin/">Meet the creator</a></div>
          </div>
          <div className="welcome-art95" aria-hidden="true"><svg className="icon95"><use href="/assets/win95/icons.svg#computer" /></svg><strong>Ballzatram 95</strong><span>Ready when you are.</span></div>
        </div>
      </section>
      <div id="programs" className="next-programs95">
        {launchpadSections.map(section => <section key={section.id} className="window95" id={`${section.id}-section`}>
          <div className="title95"><span className="window-label">{section.title}</span></div>
          <p className="next-section-description95">{section.description}</p>
          <div className="next-card-grid95">{getToolsForCategory(section.id).map(tool => <ToolCard key={tool.id} tool={tool} compact />)}</div>
        </section>)}
      </div>
      <footer className="footer95"><span>Built by Devin Gallemore. Curiosity comes standard.</span><Link href={"/archive" as Route}>Explore the archive →</Link></footer>
    </div>
  );
}
