import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { departmentById } from "@/config/departments";
import { demoStories, getStoryBySlug, getStorySlug } from "@/data/stories";
import {
  EditionMeta,
  formatEditionDate,
  RelatedToolLink,
  StoryByline,
} from "@/components/newspaper/NewspaperPrimitives";
import type { Story, StoryBodySection } from "@/types/story";

type StoryPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return demoStories.map((story) => ({ slug: getStorySlug(story) }));
}

export function generateMetadata({ params }: StoryPageProps): Metadata {
  const story = getStoryBySlug(params.slug);
  if (!story) {
    return {
      title: "Story Not Found | Ballzatram Daily",
    };
  }
  return {
    title: `${story.title} | Ballzatram Daily`,
    description: story.dek,
  };
}

function StorySection({ section }: { section: StoryBodySection }) {
  if (section.type === "bullet-list") {
    return (
      <section className="border-t border-[#2b1b10] pt-5">
        {section.heading ? <h2 className="font-serif text-3xl font-black leading-none text-[#1b1109]">{section.heading}</h2> : null}
        <ul className="mt-3 grid gap-2 text-base leading-7 text-[#3a2312]">
          {(section.items ?? []).map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7f1d1d]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const isCallout = section.type === "callout" || section.type === "data-note";
  return (
    <section className={isCallout ? "border border-[#2b1b10] bg-[#ead9ad] p-5" : "border-t border-[#2b1b10] pt-5"}>
      {section.heading ? <h2 className="font-serif text-3xl font-black leading-none text-[#1b1109]">{section.heading}</h2> : null}
      {section.content ? <p className="mt-3 text-base leading-7 text-[#3a2312]">{section.content}</p> : null}
    </section>
  );
}

function CaveatBox({ story }: { story: Story }) {
  if (!story.caveats?.length && !story.confidence) return null;
  return (
    <aside className="border border-[#2b1b10] bg-[#24150b] p-5 text-[#f4e7c8]">
      <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#e3bd72]">
        Caveats / Confidence
      </p>
      {story.confidence ? <p className="mt-2 font-serif text-2xl font-black capitalize">Confidence: {story.confidence}</p> : null}
      {story.caveats?.length ? (
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#d9c59a]">
          {story.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

export default function StoryDetailPage({ params }: StoryPageProps) {
  const story = getStoryBySlug(params.slug);
  if (!story) notFound();
  const department = departmentById[story.departmentId];

  return (
    <article className="min-h-dvh bg-[#efe3c2] text-[#24150b]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b-[3px] border-double border-[#24150b] pb-6">
          <EditionMeta label="Ballzatram Daily story file" date={formatEditionDate(story.publishedAt)} note={story.status} />
          <p className="mt-6 w-fit bg-[#7f1d1d] px-3 py-1 font-mono text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f9ead1]">
            {department.accentLabel} / {story.heroLabel}
          </p>
          <h1 className="mt-4 max-w-5xl font-serif text-[clamp(2.7rem,7vw,6.6rem)] font-black leading-[0.9] tracking-normal text-[#1b1109]">
            {story.title}
          </h1>
          <p className="mt-4 max-w-3xl font-serif text-xl font-bold leading-8 text-[#3a2312]">{story.dek}</p>
          <div className="mt-5">
            <StoryByline story={story} department={department} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em]">
            <span className="border border-[#2b1b10] px-2 py-1">Source: {story.sourceType}</span>
            {story.sourceToolId ? <span className="border border-[#2b1b10] px-2 py-1">Tool: {story.sourceToolId}</span> : null}
            {story.dataAsOf ? <span className="border border-[#2b1b10] px-2 py-1">Data as of: {story.dataAsOf}</span> : null}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="grid gap-5">
            <p className="border-b border-[#2b1b10] pb-5 text-lg leading-8 text-[#3a2312]">{story.summary}</p>
            {story.body.map((section) => (
              <StorySection key={section.id} section={section} />
            ))}
          </main>

          <aside className="grid content-start gap-4">
            <CaveatBox story={story} />
            <section className="border border-[#2b1b10] bg-[#f7edcf] p-5">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                Related tools
              </p>
              <div className="mt-4 grid gap-3">
                {story.relatedRoutes.map((route) => (
                  <RelatedToolLink key={route.href} route={route} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </article>
  );
}
