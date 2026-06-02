import type { Metadata } from "next";
import { Layout } from "@/components/Layout";
import { pageMetadata, siteMetadataBase } from "@/lib/pageMetadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteMetadataBase,
  applicationName: "Ballzatram",
  ...pageMetadata({
    title: "Ballzatram | A Strange Workshop Paper",
    description:
      "A living-lab newspaper of useful machines, playable reports, archive clippings, and honestly labeled Ballzatram prototypes.",
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
