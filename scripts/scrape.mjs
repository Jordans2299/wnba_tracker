#!/usr/bin/env node
/**
 * Scrapes WNBA salary data from Her Hoop Stats team cap sheets + ESPN rosters.
 *
 * Outputs data/salaries.json with:
 *  - players: current season cap hits + contract details + career earnings + photo URLs
 *  - teamSummaries: cap totals / cap room / guaranteed salary per team
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "data", "salaries.json");
const OVERRIDES_PATH = resolve(__dirname, "..", "data", "photo-overrides.json");

const USER_AGENT = "wnba-wage-tracker/0.1 (+scraper) Mozilla/5.0";
const CURRENT_SEASON = 2026;
const HISTORICAL_SEASONS = [2023, 2024, 2025]; // scraped for career earnings

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function teamUrlSlug(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Normalize a display name for fuzzy matching (lowercase, remove accents + punctuation). */
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[^a-z\s]/g, "")          // keep only letters + spaces
    .replace(/\s+/g, " ")
    .trim();
}

function parseDollar(text) {
  const m = text && text.match(/\$([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

async function fetchText(url, opts = {}) {
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
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
}

// ─── HHS scraping ────────────────────────────────────────────────────────────

/**
 * Parse a team cap-sheet page.
 * Returns { players, capSummary }.
 * Each player has yearlySalaries[] covering all columns shown.
 */
function parseTeamPage(html, teamName) {
  const $ = cheerio.load(html);
  const table = $("table.sortable").first();
  if (!table.length) return { players: [], capSummary: null };

  const years = [];
  table.find("thead th span.salary_year").each((_, el) => {
    const y = parseInt($(el).text().trim(), 10);
    if (!Number.isNaN(y)) years.push(y);
  });
  if (!years.length) return { players: [], capSummary: null };

  const players = [];
  table.find("tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const nameCell = $tr.find("td.salary_player_name").first();
    if (!nameCell.length) return;

    // Player name — prefer full-name anchor
    let name = nameCell.find("a.d-none.d-sm-block").first().text().trim();
    if (!name) name = nameCell.find("a").first().text().trim();
    if (!name) return;

    // Player profile URL from the anchor href
    const profileHref = nameCell.find("a").first().attr("href") || "";
    // Extract slug like "aja-wilson" from "/stats/wnba/player/aja-wilson-stats-UUID/"
    const profileSlug = profileHref
      .split("/player/")[1]
      ?.replace(/\/$/, "")
      ?.replace(/-stats-[0-9a-f-]+$/, "") || "";

    const yearCells = $tr.find("td").slice(1, 1 + years.length);
    const yearly = [];
    yearCells.each((i, td) => {
      const $td = $(td);
      const cls = $td.attr("class") || "";
      const text = $td.text().replace(/\s+/g, " ").trim();

      let salary = null;
      let status = null;

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

  // Cap summary from tfoot
  const capSummary = {
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

// ─── ESPN photo scraping ─────────────────────────────────────────────────────

/**
 * Fetch all WNBA team rosters from ESPN and return a Map of
 * normalizedName → photoUrl.
 */
async function fetchEspnPhotoMap() {
  const photoMap = new Map();
  console.log("\nFetching ESPN rosters for player photos…");

  let teamsData;
  try {
    teamsData = await fetchText(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams?limit=30",
      { isJson: true }
    );
  } catch (err) {
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
          // Upgrade to a larger headshot if possible
          const url = athlete.headshot.href.replace(
            /\/i\/headshots\/wnba\/players\/full\//,
            "/combiner/i?img=/i/headshots/wnba/players/full/"
          );
          photoMap.set(normalized, url);
        }
      }
      await sleep(200);
    } catch (_) { /* individual team failures are non-fatal */ }
  }

  console.log(`  ${photoMap.size} player photos collected`);
  return photoMap;
}

// ─── Build final records ──────────────────────────────────────────────────────

function toFrontendRecord(p, idx, photoMap, historyMap, photoOverrides) {
  const ys = p.yearlySalaries;
  const current = ys.find((y) => y.year === CURRENT_SEASON) || ys[0] || null;
  const currentSalary = current?.salary ?? 0;
  const currentStatus = current?.status ?? null;

  // Derive contract window from consecutive signed years
  let runStart = null, runEnd = null;
  for (const y of ys) {
    if (y.salary != null) {
      if (runStart === null) runStart = y.year;
      runEnd = y.year;
    } else if (runStart !== null) break;
  }

  // Career earnings: historical entries + current season
  const key = normalizeName(p.name);
  const historicalEntries = historyMap.get(key) ?? [];

  // Deduplicate: don't double-count if a historical year already appears in yearlySalaries
  const coveredYears = new Set(ys.filter(y => y.salary != null).map(y => y.year));
  const careerEntries = [
    ...historicalEntries.filter(e => !coveredYears.has(e.season)),
    // Add each signed year from current sheet as a career entry
    ...ys
      .filter(y => y.salary != null && y.year <= CURRENT_SEASON)
      .map(y => ({ season: y.year, team: p.team, salary: y.salary, status: y.status })),
  ].sort((a, b) => a.season - b.season);

  const totalCareerEarnings = careerEntries.reduce((s, e) => s + e.salary, 0);

  // Photo from ESPN, with override fallback keyed by profileSlug
  const photoUrl = photoMap.get(key) ?? photoOverrides[profileSlug] ?? null;

  // URL-safe player slug (derived from HHS profile slug, fallback to name)
  const profileSlug = p.profileSlug || p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return {
    id: `${idx + 1}`,
    name: p.name,
    team: p.team,
    salary: currentSalary,
    status: currentStatus,
    contractLengthYears: runStart != null ? runEnd - runStart + 1 : 0,
    contractStart: runStart != null ? `${runStart}-02-01` : null,
    contractEnd: runEnd != null ? `${runEnd + 1}-01-31` : null,
    yearlySalaries: ys,
    profileSlug,
    photoUrl,
    careerEarnings: careerEntries,
    totalCareerEarnings,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Current season (2026) ──────────────────────────────────────────────
  console.log(`\n═══ Scraping ${CURRENT_SEASON} (current season) ═══`);
  const currentPlayers = [];
  const teamSummaries = {};

  for (const team of TEAMS) {
    const url = `https://herhoopstats.com/salary-cap-sheet/wnba/team/${CURRENT_SEASON}/${team.slug}/`;
    process.stdout.write(`• ${team.name} … `);
    try {
      const html = await fetchText(url);
      const { players, capSummary } = parseTeamPage(html, team.name);
      console.log(`${players.length} players | cap room: ${capSummary?.capRoom != null ? "$" + capSummary.capRoom.toLocaleString() : "n/a"}`);
      currentPlayers.push(...players);
      teamSummaries[team.name] = { name: team.name, urlSlug: teamUrlSlug(team.name), ...capSummary };
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
    await sleep(400);
  }

  // ── 2. Historical seasons for career earnings ─────────────────────────────
  // historyMap: normalizedName → [{season, team, salary, status}]
  const historyMap = new Map();

  for (const season of HISTORICAL_SEASONS) {
    console.log(`\n═══ Scraping ${season} (historical) ═══`);
    for (const team of TEAMS) {
      const url = `https://herhoopstats.com/salary-cap-sheet/wnba/team/${season}/${team.slug}/`;
      process.stdout.write(`• ${team.name} (${season}) … `);
      try {
        const html = await fetchText(url);
        const { players } = parseTeamPage(html, team.name);
        let count = 0;
        for (const p of players) {
          // Only take the salary for the season year column
          const entry = p.yearlySalaries.find(y => y.year === season);
          if (!entry || entry.salary == null) continue;
          const key = normalizeName(p.name);
          if (!historyMap.has(key)) historyMap.set(key, []);
          // avoid duplicate season entries
          const existing = historyMap.get(key);
          if (!existing.some(e => e.season === season)) {
            existing.push({ season, team: team.name, salary: entry.salary, status: entry.status });
            count++;
          }
        }
        console.log(`${count} entries`);
      } catch (err) {
        // Teams that didn't exist yet (expansion teams) will 404 — that's fine
        console.log(err.message.includes("404") ? "not found (expansion team)" : `FAILED: ${err.message}`);
      }
      await sleep(400);
    }
  }

  // ── 3. ESPN photos ────────────────────────────────────────────────────────
  const photoMap = await fetchEspnPhotoMap();

  // ── 3b. Load photo overrides (manual fallbacks by profileSlug) ────────────
  let photoOverrides = {};
  try {
    photoOverrides = JSON.parse(await readFile(OVERRIDES_PATH, "utf8"));
    console.log(`\nLoaded ${Object.keys(photoOverrides).length} photo overrides`);
  } catch { /* overrides file is optional */ }

  // ── 4. Deduplicate + build final records ──────────────────────────────────
  const byKey = new Map();
  for (const p of currentPlayers) {
    const key = `${p.name}::${p.team}`;
    const existing = byKey.get(key);
    if (!existing || p.yearlySalaries.length > existing.yearlySalaries.length) {
      byKey.set(key, p);
    }
  }

  const records = Array.from(byKey.values())
    .map((p, idx) => toFrontendRecord(p, idx, photoMap, historyMap, photoOverrides))
    .sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0));

  const payload = {
    source: "https://herhoopstats.com/salary-cap-sheet/wnba/",
    season: CURRENT_SEASON,
    lastUpdated: new Date().toISOString(),
    playerCount: records.length,
    players: records,
    teamSummaries,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const withPhotos = records.filter(r => r.photoUrl).length;
  const withHistory = records.filter(r => r.careerEarnings.length > 1).length;
  console.log(`\n✓ ${records.length} players | ${withPhotos} with photos | ${withHistory} with career history`);
  console.log(`✓ Written to ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
