export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCompactCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

export function teamUrlSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://playerpay.io";

export type League = "wnba" | "nba";

export const LEAGUES: League[] = ["wnba", "nba"];

export function isLeague(value: string): value is League {
  return value === "wnba" || value === "nba";
}

export function leagueLabel(league: League): string {
  return league.toUpperCase();
}

// Fallback league salary cap (per team) used when a team-season summary is missing one.
// WNBA 2026 cap; NBA 2025-26 cap.
const LEAGUE_CAP: Record<League, number> = {
  wnba: 7_000_000,
  nba: 154_647_000,
};

export function leagueCap(league: League): number {
  return LEAGUE_CAP[league];
}

const LEAGUE_SOURCE_NAME: Record<League, string> = {
  wnba: "Her Hoop Stats",
  nba: "HoopsHype",
};

export function leagueSourceName(league: League): string {
  return LEAGUE_SOURCE_NAME[league];
}

export function playerUrl(slug: string, league: League = "wnba"): string {
  return `/${league}/players/${slug}`;
}

export function teamUrl(teamName: string, league: League = "wnba"): string {
  return `/${league}/teams/${teamUrlSlug(teamName)}`;
}
