import type { Metadata } from "next";
import { Layout } from "@/components/Layout";
import { pageMetadata, siteMetadataBase } from "@/lib/pageMetadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteMetadataBase,
  applicationName: "Ballzatram",
  ...pageMetadata({
    title: "Ballzatram | AI-Guided Tool Launchpad",
    description:
      "A lab of useful AI-guided workbenches, simulations, games, and strange little tools.",
    path: "/",
  }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
