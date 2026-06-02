import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Bullshit Simulator Prototype | Ballzatram Arcade",
  description: "Compatibility route for the first Stoney Baologna text-adventure prototype.",
  path: "/arcade/bullshit-simulator",
});

export default function BullshitSimulatorRedirectPage() {
  redirect("/arcade/bullshit-simulator");
}
