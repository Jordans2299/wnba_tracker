import type { MetadataRoute } from "next";
import { getData } from "@/lib/data";
import { LEAGUES, SITE_URL } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
  ];

  for (const league of LEAGUES) {
    const { allPlayers, teamSummaries } = await getData(league);

    entries.push(
      { url: `${SITE_URL}/${league}`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
      { url: `${SITE_URL}/${league}/highest-paid-players`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
      { url: `${SITE_URL}/${league}/lowest-paid-players`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
      { url: `${SITE_URL}/${league}/average-salary`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
      { url: `${SITE_URL}/${league}/salary-cap`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
      { url: `${SITE_URL}/${league}/rookie-salaries`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    );

    for (const t of Object.values(teamSummaries)) {
      entries.push({
        url: `${SITE_URL}/${league}/teams/${t.urlSlug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });
    }

    for (const p of allPlayers) {
      if (!p.profileSlug) continue;
      entries.push({
        url: `${SITE_URL}/${league}/players/${p.profileSlug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
  }

  return entries;
}
