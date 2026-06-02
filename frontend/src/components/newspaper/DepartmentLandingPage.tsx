import Link from "next/link";
import type { Route } from "next";
import { departmentById, departments, getDepartment, type DepartmentId } from "@/config/departments";
import { getStoriesByDepartment } from "@/data/stories";
import { EditionMeta, RelatedToolLink, StoryGrid } from "@/components/newspaper/NewspaperPrimitives";
import type { RelatedRoute } from "@/types/story";

const relatedDepartmentRoutes: Partial<Record<DepartmentId, RelatedRoute["href"]>> = {
  "quant-library": "/quant-library",
  "bettors-corner": "/weather-bot.html",
  culture: "/penitent",
  arcade: "/econ-arcade",
  laboratory: "/ai-edit-factory/",
};

export function DepartmentLandingPage({
  departmentId,
  editionNote = "Department landing / demo shell",
}: {
  departmentId: DepartmentId;
  editionNote?: string;
}) {
  const department = getDepartment(departmentId);
  const stories = getStoriesByDepartment(departmentId);
  const siblingDepartments = departments.filter((item) => item.id !== departmentId && item.storyEnabled).slice(0, 5);
  const toolRoute: RelatedRoute["href"] = relatedDepartmentRoutes[departmentId] ?? department.primaryRoute;

  return (
    <main className="min-h-dvh bg-[#efe3c2] text-[#24150b]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b-[3px] border-double border-[#24150b] pb-6">
          <EditionMeta label={editionNote} date={department.accentLabel} note={department.status} />
          <h1 className="mt-6 font-serif text-[clamp(3rem,8vw,7rem)] font-black leading-[0.84] tracking-normal text-[#1b1109]">
            {department.title}
          </h1>
          <p className="mt-4 max-w-3xl font-serif text-xl font-bold leading-8 text-[#3a2312]">{department.description}</p>
          <div className="mt-5 flex flex-wrap gap-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em]">
            <span className="border border-[#2b1b10] px-2 py-1">{department.type}</span>
            <span className="border border-[#2b1b10] px-2 py-1">Stories: {department.storyEnabled ? "enabled" : "not yet"}</span>
            <span className="border border-[#2b1b10] px-2 py-1">Tools: {department.toolEnabled ? "enabled" : "not yet"}</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="mb-4 border-b border-[#2b1b10] pb-2">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                Filed stories
              </p>
              <h2 className="font-serif text-4xl font-black leading-none text-[#1b1109]">
                Demo copy waiting for the newsroom engine.
              </h2>
            </div>
            {stories.length ? (
              <StoryGrid stories={stories} departmentsById={departmentById} compact />
            ) : (
              <div className="border border-dashed border-[#2b1b10] bg-[#f7edcf] p-5">
                <h2 className="font-serif text-3xl font-black leading-none">No demo stories filed yet.</h2>
                <p className="mt-3 text-sm leading-6 text-[#4b2b16]">
                  This department can still point readers to its current tool or placeholder while story generation waits for a later phase.
                </p>
              </div>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <section className="border border-[#2b1b10] bg-[#24150b] p-5 text-[#f4e7c8]">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#e3bd72]">
                Tool route
              </p>
              <h2 className="mt-2 font-serif text-3xl font-black leading-none">Back to the machine.</h2>
              <p className="mt-3 text-sm leading-6 text-[#d9c59a]">
                Department pages are newspaper doors first. The tool link remains visible so the story can lead back to the workbench.
              </p>
              <div className="mt-4">
                <RelatedToolLink
                  route={{
                    label: `Open ${department.shortTitle}`,
                    href: toolRoute,
                    description: department.description,
                  }}
                />
              </div>
            </section>

            <section className="border border-[#2b1b10] bg-[#ead9ad] p-5">
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
                Other desks
              </p>
              <div className="mt-4 grid gap-3">
                {siblingDepartments.map((item) => (
                  <Link
                    key={item.id}
                    href={item.primaryRoute as Route}
                    className="border-b border-[#2b1b10]/35 pb-3 text-[#24150b] last:border-b-0 last:pb-0 hover:text-[#7f1d1d]"
                  >
                    <span className="font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7a5730]">{item.accentLabel}</span>
                    <strong className="block font-serif text-xl leading-6">{item.title}</strong>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
