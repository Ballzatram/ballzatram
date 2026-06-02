import Link from "next/link";
import type { Route } from "next";
import { departmentById, departments, getDepartment } from "@/config/departments";
import { demoStories, getStoriesByDepartment } from "@/data/stories";
import {
  DepartmentRail,
  LeadStory,
  NewspaperMasthead,
  StoryCard,
  StoryGrid,
} from "@/components/newspaper/NewspaperPrimitives";
import type { Department, DepartmentId } from "@/config/departments";

const editionDate = "June 1, 2026";

function storyCounts() {
  return demoStories.reduce<Partial<Record<DepartmentId, number>>>((counts, story) => {
    counts[story.departmentId] = (counts[story.departmentId] ?? 0) + 1;
    return counts;
  }, {});
}

function toolDepartments() {
  return departments.filter((department) => department.toolEnabled);
}

function departmentRoute(department: Department): Route {
  if (department.id === "quant-library") return "/markets" as Route;
  if (department.id === "laboratory") return "/laboratory" as Route;
  if (department.id === "culture") return "/culture" as Route;
  if (department.id === "arcade") return "/arcade" as Route;
  if (department.id === "bettors-corner") return "/betting" as Route;
  return department.primaryRoute as Route;
}

export function BallzatramDailyPage() {
  const stories = [...demoStories].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const leadStory = stories.find((story) => story.departmentId === "quant-library") ?? stories[0];
  const secondaryStories = stories.filter((story) => story.id !== leadStory.id).slice(0, 4);
  const counts = storyCounts();
  const storyDepartments = departments.filter((department) => department.storyEnabled);
  const cultureStory = getStoriesByDepartment("culture")[0];
  const stoneyStory = getStoriesByDepartment("stoney-baologna")[0];
  const arcadeDepartment = getDepartment("arcade");
  const cultureDepartment = getDepartment("culture");
  const stoneyDepartment = getDepartment("stoney-baologna");

  return (
    <div className="relative z-10 min-h-dvh bg-[#efe3c2] text-[#24150b]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <NewspaperMasthead
          title="Ballzatram Daily"
          subtitle="A self-writing newspaper shell for tools, demo stories, playable oddities, and source-labeled caveats. The machines write drafts later; today the paper prints the wiring."
          editionLabel="Vol. II / Demo No. 001"
          date={editionDate}
        />

        <section id="front-page" className="mt-6 grid gap-6 border-b-[3px] border-double border-[#24150b] pb-7 lg:grid-cols-[minmax(0,1.55fr)_420px]">
          <LeadStory story={leadStory} department={departmentById[leadStory.departmentId]} />
          <div className="grid gap-5">
            <article className="border border-[#2b1b10] bg-[#24150b] p-4 text-[#f4e7c8]">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#e3bd72]">
                Editor's note
              </p>
              <h2 className="mt-2 font-serif text-3xl font-black leading-none">
                The paper is open. The robot reporter is still on probation.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#d9c59a]">
                These are seed stories from the existing product architecture. They demonstrate routing, attribution, and tool backlinks without running automated generation.
              </p>
            </article>
            <DepartmentRail departments={storyDepartments.slice(0, 8)} storyCounts={counts} routeForDepartment={departmentRoute} />
          </div>
        </section>

        <section className="grid gap-6 border-b border-[#2b1b10] py-7 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#2b1b10] pb-2">
              <div>
                <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                  Secondary stories
                </p>
                <h2 className="font-serif text-4xl font-black leading-none text-[#1b1109]">Inside The Edition</h2>
              </div>
              <Link href={"/daily" as Route} className="font-mono text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#7f1d1d]">
                Daily route
              </Link>
            </div>
            <StoryGrid stories={secondaryStories} departmentsById={departmentById} compact />
          </div>

          <aside className="border-l-0 border-[#2b1b10] lg:border-l lg:pl-6">
            <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
              Tools Behind The Stories
            </p>
            <h2 className="mt-1 font-serif text-4xl font-black leading-none text-[#1b1109]">The newsroom has machinery.</h2>
            <p className="mt-3 text-sm leading-6 text-[#4b2b16]">
              Each story keeps a path back to the desk that could produce or verify it. Some desks are live, some are prototypes, and some are just nameplates waiting for power.
            </p>
            <div className="mt-5 grid gap-3">
              {toolDepartments().slice(0, 6).map((department) => (
                <Link
                  key={department.id}
                  href={departmentRoute(department)}
                  className="grid gap-1 border border-[#2b1b10] bg-[#f7edcf] p-4 text-[#24150b] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <span className="font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7a5730]">
                    {department.accentLabel} / {department.status}
                  </span>
                  <strong className="font-serif text-2xl leading-7">{department.title}</strong>
                  <span className="text-sm leading-6">{department.description}</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-6 border-b border-[#2b1b10] py-7 lg:grid-cols-[1fr_1fr]">
          <div className="border border-[#2b1b10] bg-[#ead9ad] p-5">
            <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
              Culture / Arcade
            </p>
            <h2 className="mt-1 font-serif text-4xl font-black leading-none text-[#1b1109]">
              Playable relics, printed with labels.
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {cultureStory ? <StoryCard story={cultureStory} department={cultureDepartment} compact /> : null}
              <article className="grid content-start gap-3 border-t border-[#2b1b10] pt-4">
                <span className="w-fit bg-[#24150b] px-2 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f4e7c8]">
                  {arcadeDepartment.accentLabel}
                </span>
                <h3 className="font-serif text-2xl font-black leading-[1.02] text-[#1b1109]">{arcadeDepartment.title}</h3>
                <p className="text-sm leading-6 text-[#4b2b16]">{arcadeDepartment.description}</p>
                <Link className="font-mono text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#7f1d1d]" href={"/arcade" as Route}>
                  Open arcade desk
                </Link>
              </article>
            </div>
          </div>

          <div className="border border-[#2b1b10] bg-[#24150b] p-5 text-[#f4e7c8]">
            <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#e3bd72]">
              Current Events / Stoney placeholder
            </p>
            <h2 className="mt-1 font-serif text-4xl font-black leading-none">The briefing desk has a chair. Nobody has been allowed near the microphone.</h2>
            {stoneyStory ? (
              <div className="mt-5 border-t border-[#f4e7c8]/25 pt-4">
                <span className="bg-[#e3bd72] px-2 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#24150b]">
                  {stoneyStory.heroLabel}
                </span>
                <h3 className="mt-3 font-serif text-2xl font-black leading-[1.02] text-[#fff7df]">
                  <Link className="hover:underline" href={`/stories/${stoneyStory.id}` as Route}>
                    {stoneyStory.title}
                  </Link>
                </h3>
                <p className="mt-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#e3bd72]">
                  {stoneyDepartment.accentLabel} / {stoneyStory.sourceType}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#d9c59a]">{stoneyStory.summary}</p>
              </div>
            ) : null}
            <p className="mt-5 border-t border-[#f4e7c8]/25 pt-4 text-sm leading-6 text-[#d9c59a]">
              Stoney remains a placeholder in this newspaper phase. Existing routes stay reachable; new lore and simulator work stay out of scope.
            </p>
          </div>
        </section>

        <section id="back-issues" className="grid gap-6 py-7 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="lg:col-span-2">
            <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
              Footer links / back issues
            </p>
            <h2 className="mt-1 font-serif text-4xl font-black leading-none text-[#1b1109]">Nothing useful gets buried without a map.</h2>
          </div>
          <div className="grid gap-2 font-mono text-[0.72rem] font-black uppercase tracking-[0.14em]">
            <Link className="border border-[#2b1b10] px-3 py-2 text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/markets" as Route}>Markets desk</Link>
            <Link className="border border-[#2b1b10] px-3 py-2 text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/tools/parcel/index.html" as Route}>Parcel tool</Link>
            <Link className="border border-[#2b1b10] px-3 py-2 text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/culture" as Route}>Culture desk</Link>
            <Link className="border border-[#2b1b10] px-3 py-2 text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/arcade" as Route}>Arcade desk</Link>
            <Link className="border border-[#2b1b10] px-3 py-2 text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/internal/product-architecture" as Route}>Product architecture</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
