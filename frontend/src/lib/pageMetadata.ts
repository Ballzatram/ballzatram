import type { Metadata } from "next";

const defaultSiteUrl = "https://ballzatram.com";

export const siteMetadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl);

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}`;
  noIndex?: boolean;
  type?: "website" | "article";
};

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
  type = "website",
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Ballzatram",
      type,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
