import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/lib/seo";

export const dynamic = "force-static";

const lastModified = new Date("2026-08-20T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/boutique/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/vote/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/compte/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
  },
    {
      url: `${SITE_URL}/confidentialite/`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
