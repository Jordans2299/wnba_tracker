import type { MetadataRoute } from "next";
import { allPlayers, teamSummaries } from "@/lib/data";
import { SITE_URL } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/wnba/highest-paid-players`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/wnba/lowest-paid-players`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/wnba/average-salary`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/wnba/salary-cap`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/wnba/rookie-salaries`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const playerPages: MetadataRoute.Sitemap = allPlayers
    .filter((p) => p.profileSlug)
    .map((p) => ({
      url: `${SITE_URL}/wnba/players/${p.profileSlug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const teamPages: MetadataRoute.Sitemap = Object.values(teamSummaries).map((t) => ({
    url: `${SITE_URL}/wnba/teams/${t.urlSlug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...teamPages, ...playerPages];
}
