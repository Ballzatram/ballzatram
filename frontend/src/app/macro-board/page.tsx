import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Quant Library | Ballzatram",
  description: "Compatibility route for the former Macro Board market-analysis dashboard.",
  path: "/quant-library",
});

export default function Page() {
  redirect("/quant-library");
}
