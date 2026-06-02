import Link from "next/link";
import type { Route } from "next";

export default function StoryNotFound() {
  return (
    <section className="min-h-dvh bg-[#efe3c2] text-[#24150b]">
      <div className="mx-auto grid w-full max-w-4xl gap-5 px-4 py-12 sm:px-6 lg:px-8">
        <p className="font-mono text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#7a5730]">
          Ballzatram Daily / missing story file
        </p>
        <h1 className="font-serif text-[clamp(3rem,8vw,6rem)] font-black leading-[0.86] text-[#1b1109]">
          This clipping is not in the drawer.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[#4b2b16]">
          The story slug is missing, archived, or still waiting for a tool to produce a reviewed draft.
        </p>
        <div className="flex flex-wrap gap-2 font-mono text-[0.72rem] font-black uppercase tracking-[0.14em]">
          <Link className="border border-[#2b1b10] px-3 py-2 hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/" as Route}>
            Back to Daily
          </Link>
          <Link className="border border-[#2b1b10] px-3 py-2 hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/internal/generated-stories" as Route}>
            Generated preview
          </Link>
        </div>
      </div>
    </section>
  );
}
