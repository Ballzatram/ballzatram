import { departments, getDepartment } from "@/config/departments";
import { demoStories, getStoriesByDepartment } from "@/data/stories";

function flagLabel(value: boolean) {
  return value ? "enabled" : "later";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProductArchitecturePreviewPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-amber-300/25 bg-slate-950 p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
          Internal preview
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">
          Ballzatram v2 product architecture
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-300 sm:text-base">
          Departments and demo stories are typed product primitives for a future
          self-writing newspaper. This page is intentionally small: it proves
          the model can render without rebuilding the public newspaper UI.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => {
          const storyCount = getStoriesByDepartment(department.id).length;
          return (
            <article
              key={department.id}
              className="flex min-h-72 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    {department.accentLabel}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {department.title}
                  </h2>
                </div>
                <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold uppercase text-slate-300">
                  {department.status}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">
                {department.description}
              </p>
              <div className="mt-4 grid gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                <span>Type: {department.type}</span>
                <span>Stories: {flagLabel(department.storyEnabled)}</span>
                <span>Tools: {flagLabel(department.toolEnabled)}</span>
                <span>Demo stories: {storyCount}</span>
              </div>
              <a
                className="mt-5 inline-flex w-fit rounded-full border border-emerald-300/50 px-4 py-2 text-sm font-semibold text-emerald-100 hover:border-emerald-200 hover:text-white"
                href={department.primaryRoute}
              >
                Open current route
              </a>
            </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Placeholder story seeds
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Tool output can become newspaper copy
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {demoStories.map((story) => {
            const department = getDepartment(story.departmentId);
            return (
              <article
                key={story.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
                    {story.heroLabel}
                  </span>
                  <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
                    {department.shortTitle}
                  </span>
                  <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
                    {story.sourceType}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold leading-7 text-white">
                  {story.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {story.dek}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {story.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>Updated {formatDate(story.updatedAt)}</span>
                  {story.confidence ? <span>Confidence: {story.confidence}</span> : null}
                  {story.readingTime ? <span>{story.readingTime} min read</span> : null}
                </div>
                {story.caveats?.length ? (
                  <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                      Caveats
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
                      {story.caveats.map((caveat) => (
                        <li key={caveat}>{caveat}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {story.relatedRoutes.map((route) => (
                    <a
                      key={`${story.id}-${route.href}`}
                      className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-200 hover:text-white"
                      href={route.href}
                    >
                      {route.label}
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
