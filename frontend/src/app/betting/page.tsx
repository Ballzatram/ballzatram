import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Bettor's Corner | Ballzatram",
  description: "Compatibility route for the Bettor's Corner betting-market education desk.",
  path: "/bettors-corner",
});

export default function BettingPage() {
  redirect("/bettors-corner");
}
