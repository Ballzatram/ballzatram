import type { Metadata } from "next";
import { Layout } from "@/components/Layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ballzatram | A Strange Workshop Paper",
  description:
    "A living-lab newspaper of useful machines, playable reports, archive clippings, and honestly labeled Ballzatram prototypes.",
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
