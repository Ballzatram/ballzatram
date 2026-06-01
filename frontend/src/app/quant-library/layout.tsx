import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quant Library | Ballzatram",
  description:
    "An explainable market analysis desk for rates, indices, stocks, ETFs, risk, regimes, and time-series signals.",
};

export default function QuantLibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
