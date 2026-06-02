import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Quant Library | Ballzatram",
  description:
    "An explainable market analysis desk for rates, indices, stocks, ETFs, risk, regimes, and time-series signals.",
  path: "/quant-library",
});

export default function QuantLibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
