import type { Metadata } from "next";
import { Layout } from "@/components/Layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ballzatram | Work Shop of Playable Worlds",
  description:
    "A strange work shop of games, relics, inventions, artifacts, and mythological machinery.",
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
