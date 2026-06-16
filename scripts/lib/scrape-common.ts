// Shared helpers used by the WNBA (herhoopstats) and NBA (HoopsHype) scrapers.

export const USER_AGENT = "wnba-wage-tracker/0.1 (+scraper) Mozilla/5.0";

export type Sport = "wnba" | "nba";

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function fetchText(
  url: string,
  opts: { retries?: number; isJson?: boolean } = {}
): Promise<any> {
  const { retries = 2, isJson = false } = opts;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept: isJson ? "application/json" : "text/html,application/xhtml+xml",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return isJson ? res.json() : res.text();
    } catch (err: any) {
      if (attempt === retries) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
}

/**
 * Derive a contract window from a player's forward-looking yearly salaries.
 * Mirrors the convention used by the WNBA scraper: the run of consecutive
 * non-null salaries starting at the earliest active year.
 */
export function deriveContractWindow(
  yearly: { year: number; salary: number | null }[]
): { contractStart: string | null; contractEnd: string | null; contractLengthYears: number } {
  const sorted = [...yearly].sort((a, b) => a.year - b.year);
  let runStart: number | null = null;
  let runEnd: number | null = null;
  for (const y of sorted) {
    if (y.salary != null) {
      if (runStart === null) runStart = y.year;
      runEnd = y.year;
    } else if (runStart !== null) {
      break;
    }
  }
  return {
    contractStart: runStart != null ? `${runStart}-02-01` : null,
    contractEnd: runEnd != null ? `${runEnd + 1}-01-31` : null,
    contractLengthYears: runStart != null && runEnd != null ? runEnd - runStart + 1 : 0,
  };
}

/**
 * Build a normalized-name → headshot-URL map from ESPN's public roster API for
 * the given sport. Non-fatal: returns whatever it can collect.
 */
export async function fetchEspnPhotoMap(sport: Sport): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();
  console.log(`\nFetching ESPN ${sport.toUpperCase()} rosters for player photos...`);

  let teamsData: any;
  try {
    teamsData = await fetchText(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/${sport}/teams?limit=40`,
      { isJson: true }
    );
  } catch (err: any) {
    console.warn("  ESPN teams fetch failed:", err.message);
    return photoMap;
  }

  const espnTeams = teamsData?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  console.log(`  ${espnTeams.length} ESPN teams found`);

  const headshotRe = new RegExp(`/i/headshots/${sport}/players/full/`);
  for (const { team } of espnTeams) {
    try {
      const rosterData = await fetchText(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/${sport}/teams/${team.id}/roster`,
        { isJson: true }
      );
      const athletes = rosterData?.athletes ?? [];
      for (const athlete of athletes) {
        const normalized = normalizeName(athlete.fullName || athlete.displayName || "");
        if (normalized && athlete.headshot?.href) {
          const url = athlete.headshot.href.replace(
            headshotRe,
            `/combiner/i?img=/i/headshots/${sport}/players/full/`
          );
          photoMap.set(normalized, url);
        }
      }
      await sleep(150);
    } catch (_) {
      /* non-fatal */
    }
  }

  console.log(`  ${photoMap.size} player photos collected`);
  return photoMap;
}
