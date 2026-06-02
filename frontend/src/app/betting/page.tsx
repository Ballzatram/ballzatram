import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Bettor's Corner | Ballzatram",
  description: "Compatibility route for the Bettor's Corner betting-market education desk.",
};

export default function BettingPage() {
  redirect("/bettors-corner");
}
