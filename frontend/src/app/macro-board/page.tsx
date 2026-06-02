import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Macro Board Legacy | Ballzatram",
  description: "Compatibility route for the former Macro Board market-analysis dashboard.",
  path: "/macro-board",
});

export default function Page() {
  redirect("/quant-library");
}
