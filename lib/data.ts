import { db, schema } from "@/db";
import { eq, max } from "drizzle-orm";
import type { League } from "@/lib/utils";

export type { League };

export type YearlySalary = {
  year: number;
  salary: number | null;
  status: string | null;
};

export type CareerEntry = {
  season: number;
  team: string;
  salary: number;
  status: string | null;
};

export type Player = {
  id: string;
  name: string;
  team: string;
  salary: number;
  status: string | null;
  contractLengthYears: number;
  contractStart: string | null;
  contractEnd: string | null;
  yearlySalaries: YearlySalary[];
  profileSlug: string;
  photoUrl: string | null;
  careerEarnings: CareerEntry[];
  totalCareerEarnings: number;
};

export type TeamSummary = {
  name: string;
  urlSlug: string;
  salaryCap: number | null;
  totalSalaries: number | null;
  capRoom: number | null;
  guaranteedSalary: number | null;
  totalPlayers: number | null;
  openRosterSlots: number | null;
};

export type SalaryDataset = {
  source: string;
  season: number;
  lastUpdated: string;
  playerCount: number;
  players: Player[];
  teamSummaries: Record<string, TeamSummary>;
};

const CURRENT_SEASON = 2026;

async function buildPlayers(league: League): Promise<Player[]> {
  const allPlayerRows = await db
    .select()
    .from(schema.players)
    .where(eq(schema.players.league, league));
  const allSalaryRows = await db.select().from(schema.playerSalaries);
  const allTeamRows = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.league, league));

  const teamMap = new Map(allTeamRows.map((t) => [t.id, t]));

  const salaryByPlayer = new Map<number, typeof allSalaryRows>();
  for (const s of allSalaryRows) {
    const existing = salaryByPlayer.get(s.playerId) ?? [];
    existing.push(s);
    salaryByPlayer.set(s.playerId, existing);
  }

  const players: Player[] = [];
  for (const p of allPlayerRows) {
    const salaries = salaryByPlayer.get(p.id) ?? [];
    const currentSeason = salaries.find((s) => s.season === CURRENT_SEASON);
    if (!currentSeason) continue;

    const team = teamMap.get(currentSeason.teamId);
    if (!team) continue;

    const yearlySalaries: YearlySalary[] = salaries
      .filter((s) => s.season >= CURRENT_SEASON)
      .sort((a, b) => a.season - b.season)
      .map((s) => ({ year: s.season, salary: s.salary, status: s.status }));

    const careerEarnings: CareerEntry[] = salaries
      .filter((s) => s.salary && s.salary > 0)
      .sort((a, b) => a.season - b.season)
      .map((s) => ({
        season: s.season,
        team: teamMap.get(s.teamId)?.name ?? team.name,
        salary: s.salary!,
        status: s.status,
      }));

    const totalCareerEarnings = careerEarnings.reduce(
      (sum, e) => sum + e.salary,
      0
    );

    players.push({
      id: String(p.id),
      name: p.name,
      team: team.name,
      salary: currentSeason.salary ?? 0,
      status: currentSeason.status,
      contractLengthYears: currentSeason.contractLengthYears ?? 0,
      contractStart: currentSeason.contractStart,
      contractEnd: currentSeason.contractEnd,
      yearlySalaries,
      profileSlug: p.profileSlug,
      photoUrl: p.photoUrl,
      careerEarnings,
      totalCareerEarnings,
    });
  }

  return players;
}

async function buildTeamSummaries(league: League): Promise<Record<string, TeamSummary>> {
  const teamSeasonRows = await db
    .select()
    .from(schema.teamSeasons)
    .where(eq(schema.teamSeasons.season, CURRENT_SEASON));
  const teamRows = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.league, league));
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  const summaries: Record<string, TeamSummary> = {};
  for (const ts of teamSeasonRows) {
    const team = teamMap.get(ts.teamId);
    if (!team) continue;
    summaries[team.name] = {
      name: team.name,
      urlSlug: team.urlSlug,
      salaryCap: ts.salaryCap,
      totalSalaries: ts.totalSalaries,
      capRoom: ts.capRoom,
      guaranteedSalary: ts.guaranteedSalary,
      totalPlayers: ts.totalPlayers,
      openRosterSlots: ts.openRosterSlots,
    };
  }
  return summaries;
}

async function getLastUpdated(league: League): Promise<string> {
  const [result] = await db
    .select({ latest: max(schema.players.updatedAt) })
    .from(schema.players)
    .where(eq(schema.players.league, league));
  return result?.latest ?? new Date().toISOString();
}

const LEAGUE_SOURCE: Record<League, string> = {
  wnba: "https://herhoopstats.com/salary-cap-sheet/wnba/",
  nba: "https://hoopshype.com/salaries/",
};

type LeagueData = {
  players: Player[];
  allPlayers: Player[];
  teams: string[];
  teamSummaries: Record<string, TeamSummary>;
  meta: { league: League; source: string; season: number; lastUpdated: string };
};

export type SeasonAverage = {
  season: number;
  avg: number;
  count: number;
};

export async function getLeagueSeasonAverages(league: League): Promise<SeasonAverage[]> {
  const playerRows = await db
    .select({ id: schema.players.id })
    .from(schema.players)
    .where(eq(schema.players.league, league));
  const playerIds = new Set(playerRows.map((p) => p.id));

  const salaryRows = await db.select().from(schema.playerSalaries);

  const bySeason = new Map<number, number[]>();
  for (const s of salaryRows) {
    if (!playerIds.has(s.playerId) || !s.salary || s.salary <= 0) continue;
    if (s.season > CURRENT_SEASON) continue;
    const list = bySeason.get(s.season) ?? [];
    list.push(s.salary);
    bySeason.set(s.season, list);
  }

  return Array.from(bySeason.entries())
    .map(([season, salaries]) => ({
      season,
      avg: Math.round(salaries.reduce((s, x) => s + x, 0) / salaries.length),
      count: salaries.length,
    }))
    .sort((a, b) => a.season - b.season);
}

const _cache: Partial<Record<League, LeagueData>> = {};

export async function getData(league: League = "wnba"): Promise<LeagueData> {
  const cached = _cache[league];
  if (cached) return cached;

  const allPlayers = await buildPlayers(league);
  const players = allPlayers.filter((p) => p.salary > 0);
  const teams = Array.from(new Set(players.map((p) => p.team))).sort();
  const teamSummaries = await buildTeamSummaries(league);

  const data: LeagueData = {
    players,
    allPlayers,
    teams,
    teamSummaries,
    meta: {
      league,
      source: LEAGUE_SOURCE[league],
      season: CURRENT_SEASON,
      lastUpdated: await getLastUpdated(league),
    },
  };

  _cache[league] = data;
  return data;
}
