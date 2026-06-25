#!/usr/bin/env npx tsx
import * as cheerio from "cheerio";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  sleep,
  normalizeName,
  slugifyName,
  fetchText,
  deriveContractWindow,
  fetchEspnPhotoMap,
} from "./lib/scrape-common";

const LEAGUE = "nba";
const CURRENT_SEASON = 2027; // HoopsHype season int: 2027 == 2026-27
const NBA_CAP = 163_000_000; // 2026-27 league-wide salary cap (verify exact figure)
const ROSTER_SIZE = 15;
const BASE = "https://hoopshype.com/salaries/teams";

type HhsSeason = {
  salary: number;
  season: number;
  teamID: string;
  teamOption: boolean;
  playerOption: boolean;
  qualifyingOffer: boolean;
  twoWayContract: boolean;
  terminated: boolean;
};
type HhsContract = { playerID: string; playerName: string; seasons: HhsSeason[] };

function parseNextData(html: string): any {
  const $ = cheerio.load(html);
  const raw = $("#__NEXT_DATA__").contents().text();
  if (!raw) throw new Error("__NEXT_DATA__ not found");
  return JSON.parse(raw);
}

function queries(nd: any): any[] {
  return nd?.props?.pageProps?.dehydratedState?.queries ?? [];
}

function statusFor(s: HhsSeason): string {
  if (s.twoWayContract) return "Two-Way";
  if (s.qualifyingOffer) return "Qualifying Offer";
  if (s.playerOption) return "Player Option";
  if (s.teamOption) return "Team Option";
  return "Signed";
}

// ── Fetch league team list (id → name) + per-team page URLs ──────────────────
async function fetchTeams(): Promise<{ id: string; name: string; url: string }[]> {
  const html = await fetchText(`${BASE}/`);
  const nd = parseNextData(html);

  // team metadata: id → name
  const teamMeta = new Map<string, string>();
  for (const q of queries(nd)) {
    const teams = q?.state?.data?.teams?.teams;
    if (Array.isArray(teams)) {
      for (const t of teams) {
        if (t?.id && t?.teamName && t?.isAllStar === false) teamMeta.set(String(t.id), t.teamName);
      }
    }
  }

  // real team-page links from the index HTML: /salaries/teams/<slug>/<id>/
  const seen = new Set<string>();
  const out: { id: string; name: string; url: string }[] = [];
  const re = /href="(?:https:\/\/hoopshype\.com)?\/salaries\/teams\/([a-z0-9-]+)\/(\d+)\/"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const [, slug, id] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    const name = teamMeta.get(id);
    if (!name) continue; // skip non-team / all-star entries
    out.push({ id, name, url: `${BASE}/${slug}/${id}/` });
  }
  return out;
}

async function fetchTeamContracts(url: string): Promise<HhsContract[]> {
  const html = await fetchText(url);
  const nd = parseNextData(html);
  for (const q of queries(nd)) {
    const c = q?.state?.data?.contracts?.contracts;
    if (Array.isArray(c)) return c as HhsContract[];
  }
  return [];
}

export async function runScrapeNba(): Promise<number> {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  // ── 1. Scrape HoopsHype ───────────────────────────────────────────────────
  console.log("\n=== Fetching NBA team list (HoopsHype) ===");
  const teams = await fetchTeams();
  console.log(`  ${teams.length} teams`);
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const contractsByPlayer = new Map<string, HhsContract & { currentTeamId: string }>();
  for (const team of teams) {
    process.stdout.write(`  ${team.name} ... `);
    try {
      const contracts = await fetchTeamContracts(team.url);
      let count = 0;
      for (const c of contracts) {
        const cur = c.seasons.find((s) => s.season === CURRENT_SEASON && !s.terminated && s.salary > 0);
        if (!cur) continue; // only players on a 2026-27 contract
        if (!contractsByPlayer.has(c.playerID)) {
          contractsByPlayer.set(c.playerID, { ...c, currentTeamId: cur.teamID });
          count++;
        }
      }
      console.log(`${count} players`);
    } catch (err: any) {
      console.log(`FAILED: ${err.message}`);
    }
    await sleep(300);
  }

  // ── 2. Photos ─────────────────────────────────────────────────────────────
  const photoMap = await fetchEspnPhotoMap("nba");

  // ── 3. Load existing NBA data from DB ─────────────────────────────────────
  const existingTeams = (await db.select().from(schema.teams)).filter((t) => t.league === LEAGUE);
  const teamIdByName = new Map(existingTeams.map((t) => [t.name, t.id]));

  const existingPlayers = (await db.select().from(schema.players)).filter((p) => p.league === LEAGUE);
  const playerBySlug = new Map(existingPlayers.map((p) => [p.profileSlug, p]));
  // slug → HoopsHype playerID, to keep slugs stable & unique across re-runs
  const slugOwner = new Map<string, string>();

  const existingSalaries = await db.select().from(schema.playerSalaries);
  const salaryKey = (playerId: number, season: number) => `${playerId}:${season}`;
  const salaryMap = new Map(existingSalaries.map((s) => [salaryKey(s.playerId, s.season), s]));

  const existingTeamSeasons = await db.select().from(schema.teamSeasons);
  const teamSeasonMap = new Map(existingTeamSeasons.map((ts) => [`${ts.teamId}:${ts.season}`, ts]));

  let updateCount = 0;

  // Ensure all NBA teams exist
  async function ensureTeam(name: string): Promise<number> {
    let id = teamIdByName.get(name);
    if (id) return id;
    const urlSlug = slugifyName(name);
    const result = await db
      .insert(schema.teams)
      .values({ name, urlSlug, league: LEAGUE, hhsSlug: "" })
      .returning({ id: schema.teams.id });
    id = result[0].id;
    teamIdByName.set(name, id);
    return id;
  }
  for (const t of teams) await ensureTeam(t.name);

  // Track per-team current-season payroll for team_seasons
  const teamPayroll = new Map<number, { total: number; players: number }>();

  // ── 4. Upsert players + salaries ──────────────────────────────────────────
  console.log("\n=== Writing players & salaries ===");
  for (const [playerID, c] of contractsByPlayer) {
    const teamName = teamNameById.get(c.currentTeamId);
    if (!teamName) continue;
    const teamId = teamIdByName.get(teamName)!;

    // profile slug - derived from name, disambiguated by HoopsHype id on collision
    let profileSlug = slugifyName(c.playerName) || `player-${playerID}`;
    const owner = slugOwner.get(profileSlug);
    if (owner && owner !== playerID) profileSlug = `${profileSlug}-${playerID}`;
    slugOwner.set(profileSlug, playerID);

    const normalized = normalizeName(c.playerName);
    const photoUrl = photoMap.get(normalized) ?? null;

    // Insert or fetch player
    const now = new Date().toISOString();
    let player = playerBySlug.get(profileSlug);
    if (!player) {
      const result = await db
        .insert(schema.players)
        .values({ name: c.playerName, profileSlug, league: LEAGUE, photoUrl })
        .returning();
      player = result[0];
      playerBySlug.set(profileSlug, player);
    } else {
      const updates: Record<string, any> = { updatedAt: now };
      if (photoUrl && photoUrl !== player.photoUrl) updates.photoUrl = photoUrl;
      await db
        .update(schema.players)
        .set(updates)
        .where(eq(schema.players.id, player.id));
    }

    // HoopsHype includes full career history in c.seasons. Detect the current
    // contract's start year by scanning backward from CURRENT_SEASON and stopping
    // when a year-over-year salary jump >25% is found (signals a new deal).
    // Cap the lookback at 4 years (NBA max contract is 5 years).
    const eligibleSeasons = c.seasons
      .filter((s) => !s.terminated && s.salary > 0)
      .sort((a, b) => a.season - b.season);
    const pastSeasons = eligibleSeasons.filter((s) => s.season <= CURRENT_SEASON);

    let contractStartSeason = CURRENT_SEASON;
    for (let i = pastSeasons.length - 1; i >= 1; i--) {
      const cur = pastSeasons[i];
      const prev = pastSeasons[i - 1];
      if (cur.season < CURRENT_SEASON - 4) break; // cap at 5-year max lookback
      // gap between consecutive seasons or large salary jump signals new contract
      if (prev.season < cur.season - 1 || cur.salary / prev.salary > 1.25) {
        contractStartSeason = cur.season;
        break;
      }
      contractStartSeason = cur.season;
    }

    const contractWindowSeasons = eligibleSeasons
      .filter((s) => s.season >= contractStartSeason)
      .map((s) => ({ year: s.season, salary: s.salary > 0 ? s.salary : null }));

    let { contractStart, contractEnd, contractLengthYears } = deriveContractWindow(contractWindowSeasons);

    // Safety: NBA max contract is 5 years. If detection overshot (no clear jump
    // found), fall back to remaining years from CURRENT_SEASON.
    if (contractLengthYears > 5) {
      const remaining = eligibleSeasons
        .filter((s) => s.season >= CURRENT_SEASON)
        .map((s) => ({ year: s.season, salary: s.salary > 0 ? s.salary : null }));
      ({ contractStart, contractEnd, contractLengthYears } = deriveContractWindow(remaining));
    }

    // Write a salary row for every season with a real salary
    for (const s of c.seasons) {
      if (s.terminated || !s.salary || s.salary <= 0) continue;
      const rowTeamName = teamNameById.get(s.teamID);
      const rowTeamId = rowTeamName ? await ensureTeam(rowTeamName) : teamId;
      const isCurrent = s.season === CURRENT_SEASON;
      const status = statusFor(s);

      const existing = salaryMap.get(salaryKey(player.id, s.season));
      if (existing) {
        const updates: Record<string, any> = {};
        if (existing.salary !== s.salary) updates.salary = s.salary;
        if (existing.status !== status) updates.status = status;
        if (isCurrent) {
          if (existing.contractStart !== contractStart) updates.contractStart = contractStart;
          if (existing.contractEnd !== contractEnd) updates.contractEnd = contractEnd;
          if (existing.contractLengthYears !== contractLengthYears)
            updates.contractLengthYears = contractLengthYears;
        }
        if (Object.keys(updates).length > 0) {
          await db.update(schema.playerSalaries).set(updates).where(eq(schema.playerSalaries.id, existing.id));
          updateCount++;
        }
      } else {
        const inserted = await db
          .insert(schema.playerSalaries)
          .values({
            playerId: player.id,
            teamId: rowTeamId,
            season: s.season,
            salary: s.salary,
            status,
            contractStart: isCurrent ? contractStart : null,
            contractEnd: isCurrent ? contractEnd : null,
            contractLengthYears: isCurrent ? contractLengthYears : null,
            source: "hoopshype",
          })
          .returning();
        salaryMap.set(salaryKey(player.id, s.season), inserted[0]);
        updateCount++;
      }
    }

    // Tally current-season payroll for the player's current team
    const cur = c.seasons.find((s) => s.season === CURRENT_SEASON);
    if (cur) {
      const t = teamPayroll.get(teamId) ?? { total: 0, players: 0 };
      t.total += cur.salary;
      t.players += 1;
      teamPayroll.set(teamId, t);
    }
  }

  // ── 5. Team season summaries ──────────────────────────────────────────────
  console.log("\n=== Writing team summaries ===");
  for (const [teamId, { total, players }] of teamPayroll) {
    const summary = {
      salaryCap: NBA_CAP,
      totalSalaries: total,
      capRoom: Math.max(0, NBA_CAP - total),
      guaranteedSalary: null as number | null,
      totalPlayers: players,
      openRosterSlots: Math.max(0, ROSTER_SIZE - players),
    };
    const existing = teamSeasonMap.get(`${teamId}:${CURRENT_SEASON}`);
    if (existing) {
      const updates: Record<string, any> = {};
      if (existing.salaryCap !== summary.salaryCap) updates.salaryCap = summary.salaryCap;
      if (existing.totalSalaries !== summary.totalSalaries) updates.totalSalaries = summary.totalSalaries;
      if (existing.capRoom !== summary.capRoom) updates.capRoom = summary.capRoom;
      if (existing.totalPlayers !== summary.totalPlayers) updates.totalPlayers = summary.totalPlayers;
      if (existing.openRosterSlots !== summary.openRosterSlots) updates.openRosterSlots = summary.openRosterSlots;
      if (Object.keys(updates).length > 0) {
        await db.update(schema.teamSeasons).set(updates).where(eq(schema.teamSeasons.id, existing.id));
        updateCount++;
      }
    } else {
      await db
        .insert(schema.teamSeasons)
        .values({ teamId, season: CURRENT_SEASON, ...summary })
        .onConflictDoNothing();
      updateCount++;
    }
  }

  console.log(`\nNBA scrape complete: ${contractsByPlayer.size} players, ${updateCount} records written/updated`);
  return updateCount;
}

const isMain = process.argv[1]?.endsWith("scrape-nba.ts") || process.argv[1]?.endsWith("scrape-nba.js");
if (isMain) {
  runScrapeNba().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
