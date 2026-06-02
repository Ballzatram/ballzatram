import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { BullshitSimulatorPrototype } from "@/components/bullshit-simulator/BullshitSimulatorPrototype";

export const metadata: Metadata = {
  title: "Bullshit Simulator Prototype | Ballzatram Arcade",
  description:
    "A lightweight text-adventure prototype for Stoney Baologna and the Siege of South Gate Mall.",
};

export default function BullshitSimulatorPage() {
  return (
    <main className="min-h-dvh bg-[#efe3c2] text-[#24150b]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 pb-16 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap gap-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em]">
          <Link className="border border-[#2b1b10] px-3 py-2 text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/arcade" as Route}>
            Arcade
          </Link>
          <Link className="border border-[#2b1b10] px-3 py-2 text-[#24150b] hover:bg-[#24150b] hover:text-[#f4e7c8]" href={"/stoney-baologna" as Route}>
            Stoney file
          </Link>
        </nav>
        <BullshitSimulatorPrototype />
      </div>
    </main>
  );
}
