import Link from "next/link";
import type { Route } from "next";
import type { Department } from "@/config/departments";
import type { RelatedRoute, Story } from "@/types/story";

export function storySlug(story: Pick<Story, "id">) {
  return story.id;
}

export function storyHref(story: Pick<Story, "id">) {
  return `/stories/${storySlug(story)}` as Route;
}

export function formatEditionDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function sourceLabel(sourceType: Story["sourceType"]) {
  return sourceType.replace("-", " ");
}

export function EditionMeta({
  label,
  date,
  note,
}: {
  label: string;
  date: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-y border-[#2b1b10] py-2 text-center font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#4b2b16]">
      <span>{label}</span>
      <span>{date}</span>
      {note ? <span>{note}</span> : null}
    </div>
  );
}

export function NewspaperMasthead({
  title = "Ballzatram Daily",
  subtitle,
  editionLabel,
  date,
}: {
  title?: string;
  subtitle: string;
  editionLabel: string;
  date: string;
}) {
  return (
    <header className="border-b-[3px] border-double border-[#24150b] pb-5 text-center">
      <img className="mx-auto mb-3 h-auto w-44 max-w-full" src="/assets/title.png" alt="Ballzatram" />
      <p className="mx-auto mb-3 w-fit border border-[#24150b] px-3 py-1 font-mono text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#24150b]">
        Self-writing newspaper / demo edition
      </p>
      <h1 className="font-serif text-[clamp(3.2rem,10vw,8.5rem)] font-black leading-[0.82] tracking-normal text-[#1b1109]">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-3xl text-balance font-serif text-lg font-bold leading-7 text-[#4b2b16]">
        {subtitle}
      </p>
      <div className="mt-5">
        <EditionMeta label={editionLabel} date={date} note="Placeholder stories only" />
      </div>
    </header>
  );
}

export function StoryByline({
  story,
  department,
}: {
  story: Story;
  department: Department;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#6f4a25]">
      <span>{department.accentLabel}</span>
      <span>{formatEditionDate(story.publishedAt)}</span>
      <span>{sourceLabel(story.sourceType)}</span>
      {story.readingTime ? <span>{story.readingTime} min read</span> : null}
    </div>
  );
}

export function RelatedToolLink({ route }: { route: RelatedRoute }) {
  return (
    <Link
      href={route.href as Route}
      className="block border border-[#2b1b10] bg-[#1f160d] px-4 py-3 text-[#f4e7c8] transition hover:-translate-y-0.5 hover:bg-[#2f2112] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f1d1d]"
    >
      <span className="font-mono text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#e3bd72]">
        Tool link
      </span>
      <strong className="mt-1 block font-serif text-lg leading-6">{route.label}</strong>
      {route.description ? <span className="mt-1 block text-sm leading-6 text-[#d9c59a]">{route.description}</span> : null}
    </Link>
  );
}

export function StoryCard({
  story,
  department,
  compact = false,
}: {
  story: Story;
  department: Department;
  compact?: boolean;
}) {
  return (
    <article className="group grid content-start gap-3 border-t border-[#2b1b10] pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-[#24150b] px-2 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f4e7c8]">
          {story.heroLabel}
        </span>
        <span className="font-mono text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#7a5730]">
          {story.status}
        </span>
      </div>
      <h3 className={`${compact ? "text-xl" : "text-2xl"} font-serif font-black leading-[1.02] text-[#1b1109]`}>
        <Link className="decoration-[#7f1d1d] decoration-2 underline-offset-4 group-hover:underline" href={storyHref(story)}>
          {story.title}
        </Link>
      </h3>
      <StoryByline story={story} department={department} />
      <p className="text-sm leading-6 text-[#4b2b16]">{compact ? story.summary : story.dek}</p>
    </article>
  );
}

export function LeadStory({
  story,
  department,
}: {
  story: Story;
  department: Department;
}) {
  return (
    <article className="grid gap-4 border-b border-[#2b1b10] pb-5 lg:border-b-0 lg:border-r lg:pr-6">
      <span className="w-fit bg-[#7f1d1d] px-3 py-1 font-mono text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f9ead1]">
        Lead story / {story.heroLabel}
      </span>
      <h2 className="font-serif text-[clamp(2.5rem,6vw,5.2rem)] font-black leading-[0.9] tracking-normal text-[#1b1109]">
        <Link className="decoration-[#7f1d1d] decoration-4 underline-offset-4 hover:underline" href={storyHref(story)}>
          {story.title}
        </Link>
      </h2>
      <StoryByline story={story} department={department} />
      <p className="max-w-3xl font-serif text-xl font-bold leading-8 text-[#3a2312]">{story.dek}</p>
      <p className="max-w-3xl text-base leading-7 text-[#4b2b16]">{story.summary}</p>
      <div className="flex flex-wrap gap-2">
        {story.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="border border-[#2b1b10] px-2 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#4b2b16]">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

export function StoryGrid({
  stories,
  departmentsById,
  compact = false,
}: {
  stories: Story[];
  departmentsById: Record<Story["departmentId"], Department>;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} department={departmentsById[story.departmentId]} compact={compact} />
      ))}
    </div>
  );
}

export function DepartmentRail({
  departments,
  storyCounts,
  routeForDepartment,
}: {
  departments: Department[];
  storyCounts: Partial<Record<Department["id"], number>>;
  routeForDepartment?: (department: Department) => Route;
}) {
  return (
    <aside className="border border-[#2b1b10] bg-[#ead9ad] p-4">
      <h2 className="border-b border-[#2b1b10] pb-2 font-serif text-2xl font-black leading-none text-[#1b1109]">
        Department Rail
      </h2>
      <div className="mt-4 grid gap-3">
        {departments.map((department) => (
          <Link
            key={department.id}
            href={routeForDepartment?.(department) ?? (department.primaryRoute as Route)}
            className="grid gap-1 border-b border-[#2b1b10]/35 pb-3 text-[#24150b] last:border-b-0 last:pb-0 hover:text-[#7f1d1d]"
          >
            <span className="font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7a5730]">
              {department.accentLabel} / {department.status}
            </span>
            <strong className="font-serif text-xl leading-6">{department.title}</strong>
            <span className="text-sm leading-5">{storyCounts[department.id] ?? 0} demo stories filed</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
