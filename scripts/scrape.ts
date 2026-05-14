#!/usr/bin/env npx tsx
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OVERRIDES_PATH = resolve(__dirname, "..", "data", "photo-overrides.json");

const USER_AGENT = "wnba-wage-tracker/0.1 (+scraper) Mozilla/5.0";
const CURRENT_SEASON = 2026;
const HISTORICAL_SEASONS = [2023, 2024, 2025];

const TEAMS = [
  { name: "Atlanta Dream",          slug: "atlanta-dream-11eaecc7-356c-1364-b611-2362f5011b0b" },
  { name: "Chicago Sky",            slug: "chicago-sky-11eaecc7-355f-1c4a-b611-2362f5011b0b" },
  { name: "Connecticut Sun",        slug: "connecticut-sun-11eaecc7-3562-4a0a-b611-2362f5011b0b" },
  { name: "Dallas Wings",           slug: "dallas-wings-11eaecc7-3583-13fc-b611-2362f5011b0b" },
  { name: "Golden State Valkyries", slug: "golden-state-valkyries-11efb2ba-e2c6-f520-8806-9a93b15b3fec" },
  { name: "Indiana Fever",          slug: "indiana-fever-11eaecc7-3565-c004-b611-2362f5011b0b" },
  { name: "Las Vegas Aces",         slug: "las-vegas-aces-11eaecc7-3575-e2fe-b611-2362f5011b0b" },
  { name: "Los Angeles Sparks",     slug: "los-angeles-sparks-11eaecc7-3579-2ce8-b611-2362f5011b0b" },
  { name: "Minnesota Lynx",         slug: "minnesota-lynx-11eaecc7-357c-772c-b611-2362f5011b0b" },
  { name: "New York Liberty",       slug: "new-york-liberty-11eaecc7-356f-5524-b611-2362f5011b0b" },
  { name: "Phoenix Mercury",        slug: "phoenix-mercury-11eaecc7-357f-c1ca-b611-2362f5011b0b" },
  { name: "Portland Fire",          slug: "portland-fire-11f12f9b-e0d3-cc34-a877-9a93b15b3fec" },
  { name: "Seattle Storm",          slug: "seattle-storm-11eaecc7-3572-876c-b611-2362f5011b0b" },
  { name: "Toronto Tempo",          slug: "toronto-tempo-11f12f9b-dc63-0fe8-a877-9a93b15b3fec" },
  { name: "Washington Mystics",     slug: "washington-mystics-11eaecc7-3568-d154-b611-2362f5011b0b" },
];

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function teamUrlSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDollar(text: string): number | null {
  const m = text && text.match(/\$([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

async function fetchText(url: string, opts: { retries?: number; isJson?: boolean } = {}) {
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

type ScrapedPlayer = {
  name: string;
  profileSlug: string;
  team: string;
  yearlySalaries: { year: number; salary: number | null; status: string | null }[];
};

type CapSummary = {
  salaryCap: number | null;
  totalSalaries: number | null;
  capRoom: number | null;
  guaranteedSalary: number | null;
  totalPlayers: number | null;
  openRosterSlots: number | null;
};

function parseTeamPage(html: string, teamName: string): { players: ScrapedPlayer[]; capSummary: CapSummary | null } {
  const $ = cheerio.load(html);
  const table = $("table.sortable").first();
  if (!table.length) return { players: [], capSummary: null };

  const years: number[] = [];
  table.find("thead th span.salary_year").each((_, el) => {
    const y = parseInt($(el).text().trim(), 10);
    if (!Number.isNaN(y)) years.push(y);
  });
  if (!years.length) return { players: [], capSummary: null };

  const players: ScrapedPlayer[] = [];
  table.find("tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const nameCell = $tr.find("td.salary_player_name").first();
    if (!nameCell.length) return;

    let name = nameCell.find("a.d-none.d-sm-block").first().text().trim();
    if (!name) name = nameCell.find("a").first().text().trim();
    if (!name) return;

    const profileHref = nameCell.find("a").first().attr("href") || "";
    const profileSlug = profileHref
      .split("/player/")[1]
      ?.replace(/\/$/, "")
      ?.replace(/-stats-[0-9a-f-]+$/, "") || "";

    const yearCells = $tr.find("td").slice(1, 1 + years.length);
    const yearly: { year: number; salary: number | null; status: string | null }[] = [];
    yearCells.each((i, td) => {
      const $td = $(td);
      const cls = $td.attr("class") || "";
      const text = $td.text().replace(/\s+/g, " ").trim();

      let salary: number | null = null;
      let status: string | null = null;

      const dollarMatch = text.match(/\$([\d,]+)/);
      if (dollarMatch) salary = parseInt(dollarMatch[1].replace(/,/g, ""), 10);

      const tokenMatch = text.match(/^(UFA|RFA|Core|Rookie|Cored|ELM)$/i);
      if (tokenMatch) {
        status = tokenMatch[1].toUpperCase();
      } else if (cls.includes("salary_protected_veteran")) {
        status = "Protected Veteran";
      } else if (cls.includes("salary_supermax")) {
        status = "Supermax";
      } else if (cls.includes("salary_cap_hit") && salary != null) {
        status = "Signed";
      }

      yearly.push({ year: years[i], salary, status });
    });

    players.push({ name, profileSlug, team: teamName, yearlySalaries: yearly });
  });

  const capSummary: CapSummary = {
    salaryCap: null, totalSalaries: null, capRoom: null,
    guaranteedSalary: null, totalPlayers: null, openRosterSlots: null,
  };
  table.find("tfoot tr").each((_, tr) => {
    const cells = $(tr).find("td");
    const label = cells.first().text().replace(/\s+/g, " ").trim();
    const valText = cells.eq(1).text().replace(/\s+/g, " ").trim();
    switch (label) {
      case "Salary Cap":              capSummary.salaryCap = parseDollar(valText); break;
      case "Total Salaries":          capSummary.totalSalaries = parseDollar(valText); break;
      case "Cap Room":                capSummary.capRoom = parseDollar(valText); break;
      case "Total Guaranteed Salary": capSummary.guaranteedSalary = parseDollar(valText); break;
      case "Total Players":           capSummary.totalPlayers = parseInt(valText, 10) || null; break;
      case "Open Roster Slots":       capSummary.openRosterSlots = parseInt(valText, 10) || null; break;
    }
  });

  return { players, capSummary };
}

async function fetchEspnPhotoMap(): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();
  console.log("\nFetching ESPN rosters for player photos...");

  let teamsData: any;
  try {
    teamsData = await fetchText(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams?limit=30",
      { isJson: true }
    );
  } catch (err: any) {
    console.warn("  ESPN teams fetch failed:", err.message);
    return photoMap;
  }

  const espnTeams = teamsData?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  console.log(`  ${espnTeams.length} ESPN teams found`);

  for (const { team } of espnTeams) {
    try {
      const rosterData = await fetchText(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${team.id}/roster`,
        { isJson: true }
      );
      const athletes = rosterData?.athletes ?? [];
      for (const athlete of athletes) {
        const normalized = normalizeName(athlete.fullName || athlete.displayName || "");
        if (normalized && athlete.headshot?.href) {
          const url = athlete.headshot.href.replace(
            /\/i\/headshots\/wnba\/players\/full\//,
            "/combiner/i?img=/i/headshots/wnba/players/full/"
          );
          photoMap.set(normalized, url);
        }
      }
      await sleep(200);
    } catch (_) { /* non-fatal */ }
  }

  console.log(`  ${photoMap.size} player photos collected`);
  return photoMap;
}

// ─── Database comparison + pending_updates ──────────────────────────────────

async function createPendingUpdate(
  db: ReturnType<typeof drizzle>,
  entityType: string,
  entityRef: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  source: string
) {
  if (oldValue === newValue) return;
  await db.insert(schema.pendingUpdates).values({
    entityType,
    entityRef,
    fieldName,
    oldValue,
    newValue,
    source,
    status: "pending",
  });
}

export async function runScrape() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  // Load existing data from DB
  const existingTeams = await db.select().from(schema.teams);
  const teamIdByName = new Map(existingTeams.map((t) => [t.name, t.id]));
  const teamIdBySlug = new Map(existingTeams.map((t) => [t.urlSlug, t.id]));

  const existingPlayers = await db.select().from(schema.players);
  const playerBySlug = new Map(existingPlayers.map((p) => [p.profileSlug, p]));

  const existingSalaries = await db.select().from(schema.playerSalaries);
  const salaryKey = (playerId: number, season: number) => `${playerId}:${season}`;
  const salaryMap = new Map(existingSalaries.map((s) => [salaryKey(s.playerId, s.season), s]));

  const existingTeamSeasons = await db.select().from(schema.teamSeasons);
  const teamSeasonMap = new Map(existingTeamSeasons.map((ts) => [`${ts.teamId}:${ts.season}`, ts]));

  let pendingCount = 0;

  // ── 1. Scrape current season ──────────────────────────────────────────────
  console.log(`\n=== Scraping ${CURRENT_SEASON} (current season) ===`);
  const scrapedPlayers: ScrapedPlayer[] = [];
  const scrapedTeamSummaries: Record<string, { name: string; urlSlug: string } & CapSummary> = {};

  for (const team of TEAMS) {
    const url = `https://herhoopstats.com/salary-cap-sheet/wnba/team/${CURRENT_SEASON}/${team.slug}/`;
    process.stdout.write(`  ${team.name} ... `);
    try {
      const html = await fetchText(url);
      const { players, capSummary } = parseTeamPage(html, team.name);
      console.log(`${players.length} players`);
      scrapedPlayers.push(...players);
      if (capSummary) {
        scrapedTeamSummaries[team.name] = { name: team.name, urlSlug: teamUrlSlug(team.name), ...capSummary };
      }
    } catch (err: any) {
      console.log(`FAILED: ${err.message}`);
    }
    await sleep(400);
  }

  // ── 2. Historical seasons ────────────────────────────────────────────────
  const historyMap = new Map<string, { season: number; team: string; salary: number; status: string | null }[]>();

  for (const season of HISTORICAL_SEASONS) {
    console.log(`\n=== Scraping ${season} (historical) ===`);
    for (const team of TEAMS) {
      const url = `https://herhoopstats.com/salary-cap-sheet/wnba/team/${season}/${team.slug}/`;
      process.stdout.write(`  ${team.name} (${season}) ... `);
      try {
        const html = await fetchText(url);
        const { players } = parseTeamPage(html, team.name);
        let count = 0;
        for (const p of players) {
          const entry = p.yearlySalaries.find(y => y.year === season);
          if (!entry || entry.salary == null) continue;
          const key = normalizeName(p.name);
          if (!historyMap.has(key)) historyMap.set(key, []);
          const existing = historyMap.get(key)!;
          if (!existing.some(e => e.season === season)) {
            existing.push({ season, team: team.name, salary: entry.salary, status: entry.status });
            count++;
          }
        }
        console.log(`${count} entries`);
      } catch (err: any) {
        console.log(err.message.includes("404") ? "not found (expansion)" : `FAILED: ${err.message}`);
      }
      await sleep(400);
    }
  }

  // ── 3. ESPN photos (applied directly, no approval needed) ────────────────
  const photoMap = await fetchEspnPhotoMap();

  let photoOverrides: Record<string, string> = {};
  try {
    photoOverrides = JSON.parse(await readFile(OVERRIDES_PATH, "utf8"));
    console.log(`\nLoaded ${Object.keys(photoOverrides).length} photo overrides`);
  } catch { /* optional */ }

  // ── 4. Deduplicate scraped players ────────────────────────────────────────
  const byKey = new Map<string, ScrapedPlayer>();
  for (const p of scrapedPlayers) {
    const key = `${p.name}::${p.team}`;
    const existing = byKey.get(key);
    if (!existing || p.yearlySalaries.length > existing.yearlySalaries.length) {
      byKey.set(key, p);
    }
  }

  // ── 5. Compare with DB and create pending updates ────────────────────────
  console.log("\n=== Comparing with database ===");

  for (const [, p] of byKey) {
    const profileSlug = p.profileSlug || p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let teamId = teamIdByName.get(p.team);

    // Insert new team if needed
    if (!teamId) {
      const urlSlug = teamUrlSlug(p.team);
      const hhsSlug = TEAMS.find(t => t.name === p.team)?.slug ?? urlSlug;
      const result = await db.insert(schema.teams).values({ name: p.team, urlSlug, hhsSlug }).returning({ id: schema.teams.id });
      teamId = result[0].id;
      teamIdByName.set(p.team, teamId);
    }

    // Insert new player if needed
    let player = playerBySlug.get(profileSlug);
    if (!player) {
      const normalized = normalizeName(p.name);
      const photoUrl = photoMap.get(normalized) ?? photoOverrides[profileSlug] ?? null;
      const result = await db.insert(schema.players)
        .values({ name: p.name, profileSlug, photoUrl })
        .returning();
      player = result[0];
      playerBySlug.set(profileSlug, player);
    } else {
      // Update photo directly (no approval needed)
      const normalized = normalizeName(p.name);
      const newPhoto = photoMap.get(normalized) ?? photoOverrides[profileSlug] ?? null;
      if (newPhoto && newPhoto !== player.photoUrl) {
        await db.update(schema.players)
          .set({ photoUrl: newPhoto, updatedAt: new Date().toISOString() })
          .where(eq(schema.players.id, player.id));
      }
    }

    // Derive contract window
    const ys = p.yearlySalaries;
    let runStart: number | null = null, runEnd: number | null = null;
    for (const y of ys) {
      if (y.salary != null) {
        if (runStart === null) runStart = y.year;
        runEnd = y.year;
      } else if (runStart !== null) break;
    }
    const contractLength = runStart != null && runEnd != null ? runEnd - runStart + 1 : 0;
    const contractStart = runStart != null ? `${runStart}-02-01` : null;
    const contractEnd = runEnd != null ? `${runEnd + 1}-01-31` : null;

    // Check current season salary
    const currentYs = ys.find(y => y.year === CURRENT_SEASON);
    if (currentYs) {
      const existing = salaryMap.get(salaryKey(player.id, CURRENT_SEASON));
      const entityRef = `${profileSlug}:${CURRENT_SEASON}`;

      if (existing) {
        if (currentYs.salary !== existing.salary) {
          await createPendingUpdate(db, "player_salary", entityRef, "salary",
            String(existing.salary), String(currentYs.salary), "hhs");
          pendingCount++;
        }
        if (currentYs.status !== existing.status) {
          await createPendingUpdate(db, "player_salary", entityRef, "status",
            existing.status, currentYs.status, "hhs");
          pendingCount++;
        }
        if (contractStart !== existing.contractStart) {
          await createPendingUpdate(db, "player_salary", entityRef, "contract_start",
            existing.contractStart, contractStart, "hhs");
          pendingCount++;
        }
        if (contractEnd !== existing.contractEnd) {
          await createPendingUpdate(db, "player_salary", entityRef, "contract_end",
            existing.contractEnd, contractEnd, "hhs");
          pendingCount++;
        }
        if (contractLength !== existing.contractLengthYears) {
          await createPendingUpdate(db, "player_salary", entityRef, "contract_length_years",
            String(existing.contractLengthYears), String(contractLength), "hhs");
          pendingCount++;
        }
      } else {
        // New salary record — insert directly (new data is not a "change")
        await db.insert(schema.playerSalaries).values({
          playerId: player.id,
          teamId: teamId!,
          season: CURRENT_SEASON,
          salary: currentYs.salary,
          status: currentYs.status,
          contractStart,
          contractEnd,
          contractLengthYears: contractLength,
          source: "hhs",
        }).onConflictDoNothing();
      }
    }

    // Check historical salaries
    const normalized = normalizeName(p.name);
    const history = historyMap.get(normalized) ?? [];
    for (const entry of history) {
      const existing = salaryMap.get(salaryKey(player.id, entry.season));
      if (!existing) {
        const entryTeamId = teamIdByName.get(entry.team) ?? teamId!;
        await db.insert(schema.playerSalaries).values({
          playerId: player.id,
          teamId: entryTeamId,
          season: entry.season,
          salary: entry.salary,
          status: entry.status,
          source: "hhs",
        }).onConflictDoNothing();
      }
    }

    // Future years from yearlySalaries
    for (const ys2 of p.yearlySalaries) {
      if (ys2.year <= CURRENT_SEASON || ys2.salary == null) continue;
      const existing = salaryMap.get(salaryKey(player.id, ys2.year));
      if (!existing) {
        await db.insert(schema.playerSalaries).values({
          playerId: player.id,
          teamId: teamId!,
          season: ys2.year,
          salary: ys2.salary,
          status: ys2.status,
          source: "hhs",
        }).onConflictDoNothing();
      } else if (ys2.salary !== existing.salary) {
        const entityRef = `${profileSlug}:${ys2.year}`;
        await createPendingUpdate(db, "player_salary", entityRef, "salary",
          String(existing.salary), String(ys2.salary), "hhs");
        pendingCount++;
      }
    }
  }

  // ── 6. Compare team season summaries ──────────────────────────────────────
  for (const [name, summary] of Object.entries(scrapedTeamSummaries)) {
    const teamId = teamIdByName.get(name);
    if (!teamId) continue;

    const existing = teamSeasonMap.get(`${teamId}:${CURRENT_SEASON}`);
    const entityRef = `${summary.urlSlug}:${CURRENT_SEASON}`;

    if (existing) {
      const fields: [string, any, any][] = [
        ["salary_cap", existing.salaryCap, summary.salaryCap],
        ["total_salaries", existing.totalSalaries, summary.totalSalaries],
        ["cap_room", existing.capRoom, summary.capRoom],
        ["guaranteed_salary", existing.guaranteedSalary, summary.guaranteedSalary],
        ["total_players", existing.totalPlayers, summary.totalPlayers],
        ["open_roster_slots", existing.openRosterSlots, summary.openRosterSlots],
      ];
      for (const [field, oldVal, newVal] of fields) {
        if (oldVal !== newVal) {
          await createPendingUpdate(db, "team_season", entityRef, field,
            oldVal != null ? String(oldVal) : null,
            newVal != null ? String(newVal) : null,
            "hhs");
          pendingCount++;
        }
      }
    } else {
      await db.insert(schema.teamSeasons).values({
        teamId,
        season: CURRENT_SEASON,
        salaryCap: summary.salaryCap,
        totalSalaries: summary.totalSalaries,
        capRoom: summary.capRoom,
        guaranteedSalary: summary.guaranteedSalary,
        totalPlayers: summary.totalPlayers,
        openRosterSlots: summary.openRosterSlots,
      }).onConflictDoNothing();
    }
  }

  console.log(`\nScrape complete: ${pendingCount} pending updates created`);
  return pendingCount;
}

// Run directly if this file is the entry point
const isMain = process.argv[1]?.endsWith("scrape.ts") || process.argv[1]?.endsWith("scrape.js");
if (isMain) {
  runScrape().catch((err) => { console.error(err); process.exit(1); });
}
