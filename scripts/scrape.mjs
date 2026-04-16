#!/usr/bin/env node
/**
 * Scrapes WNBA salary data from Her Hoop Stats team cap sheets and writes
 * a consolidated JSON file at data/salaries.json.
 *
 * Source: https://herhoopstats.com/salary-cap-sheet/wnba/team/<year>/<team-slug>/
 *
 * Notes
 * - We scrape per-team pages because they include multi-year cap hits and
 *   status labels (UFA / RFA / Core / Protected Veteran / etc.). The all-
 *   players page lacks team and multi-year contract columns.
 * - Contract length / start / end are DERIVED from the span of consecutive
 *   signed years shown on the page. Her Hoop Stats does not publish the
 *   original contract signing date, so `contractStart` is the first signed
 *   year shown (Feb 1 of that year) and `contractEnd` is Jan 31 of the year
 *   following the last consecutive signed year.
 * - Be polite: small delay between team requests.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "data", "salaries.json");

const USER_AGENT =
  "wnba-wage-tracker/0.1 (+scraper; contact: see repo) Mozilla/5.0";

const CURRENT_SEASON = 2026; // Season shown on the current cap sheet

// Slugs pulled from the team selector on the cap-sheet index page.
// Keep this list in sync if new franchises are added.
const TEAMS = [
  { name: "Atlanta Dream",         slug: "atlanta-dream-11eaecc7-356c-1364-b611-2362f5011b0b" },
  { name: "Chicago Sky",           slug: "chicago-sky-11eaecc7-355f-1c4a-b611-2362f5011b0b" },
  { name: "Connecticut Sun",       slug: "connecticut-sun-11eaecc7-3562-4a0a-b611-2362f5011b0b" },
  { name: "Dallas Wings",          slug: "dallas-wings-11eaecc7-3583-13fc-b611-2362f5011b0b" },
  { name: "Golden State Valkyries",slug: "golden-state-valkyries-11efb2ba-e2c6-f520-8806-9a93b15b3fec" },
  { name: "Indiana Fever",         slug: "indiana-fever-11eaecc7-3565-c004-b611-2362f5011b0b" },
  { name: "Las Vegas Aces",        slug: "las-vegas-aces-11eaecc7-3575-e2fe-b611-2362f5011b0b" },
  { name: "Los Angeles Sparks",    slug: "los-angeles-sparks-11eaecc7-3579-2ce8-b611-2362f5011b0b" },
  { name: "Minnesota Lynx",        slug: "minnesota-lynx-11eaecc7-357c-772c-b611-2362f5011b0b" },
  { name: "New York Liberty",      slug: "new-york-liberty-11eaecc7-356f-5524-b611-2362f5011b0b" },
  { name: "Phoenix Mercury",       slug: "phoenix-mercury-11eaecc7-357f-c1ca-b611-2362f5011b0b" },
  { name: "Portland Fire",         slug: "portland-fire-11f12f9b-e0d3-cc34-a877-9a93b15b3fec" },
  { name: "Seattle Storm",         slug: "seattle-storm-11eaecc7-3572-876c-b611-2362f5011b0b" },
  { name: "Toronto Tempo",         slug: "toronto-tempo-11f12f9b-dc63-0fe8-a877-9a93b15b3fec" },
  { name: "Washington Mystics",    slug: "washington-mystics-11eaecc7-3568-d154-b611-2362f5011b0b" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url, { retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      const backoff = 1000 * (attempt + 1);
      console.warn(`  retry ${attempt + 1} after ${backoff}ms: ${err.message}`);
      await sleep(backoff);
    }
  }
}

/**
 * Parse a team cap-sheet HTML page into an array of player records.
 */
function parseTeamPage(html, teamName) {
  const $ = cheerio.load(html);
  const table = $("table.sortable").first();
  if (table.length === 0) {
    console.warn(`  no salary table found for ${teamName}`);
    return [];
  }

  // Collect the year columns in the order they appear.
  const years = [];
  table.find("thead th span.salary_year").each((_, el) => {
    const y = parseInt($(el).text().trim(), 10);
    if (!Number.isNaN(y)) years.push(y);
  });
  if (years.length === 0) {
    console.warn(`  no year columns for ${teamName}`);
    return [];
  }

  const players = [];

  table.find("tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const nameCell = $tr.find("td.salary_player_name").first();
    if (nameCell.length === 0) return; // subtotal / empty row

    // Grab the player's displayed name. Prefer the full-name anchor
    // (d-none d-sm-block) over the short anchor (d-block d-sm-none).
    let name = nameCell.find("a.d-none.d-sm-block").first().text().trim();
    if (!name) name = nameCell.find("a").first().text().trim();
    if (!name) name = nameCell.text().trim().split("\n")[0].trim();
    if (!name) return;

    // Walk the year cells. Each tr has one name cell, then one cell per year,
    // followed by a final "Core Years" cell we ignore.
    const yearCells = $tr.find("td").slice(1, 1 + years.length);
    const yearly = [];
    yearCells.each((i, td) => {
      const $td = $(td);
      const cls = $td.attr("class") || "";
      const text = $td.text().replace(/\s+/g, " ").trim();

      let salary = null;
      let status = null;

      const dollarMatch = text.match(/\$([\d,]+)/);
      if (dollarMatch) {
        salary = parseInt(dollarMatch[1].replace(/,/g, ""), 10);
      }

      // Status comes from either a short token in the cell ("UFA", "RFA",
      // "Core", "Rookie") or from class-based flags when a dollar amount is
      // present.
      const tokenMatch = text.match(/^\b(UFA|RFA|Core|Rookie|Cored|ELM)\b$/);
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

    players.push({
      name,
      team: teamName,
      yearlySalaries: yearly,
    });
  });

  return players;
}

/**
 * Derive a flat Player record the frontend expects, from the yearlySalaries
 * array. Contract start/end are inferred from the run of consecutive signed
 * years beginning at the current season.
 */
function toFrontendRecord(p, idx) {
  const ys = p.yearlySalaries;

  // Current-season salary (the number the UI sorts by by default).
  const current = ys.find((y) => y.year === CURRENT_SEASON) || ys[0] || null;
  const currentSalary = current?.salary ?? 0;
  const currentStatus = current?.status ?? null;

  // Longest run of consecutive signed years starting at the current season.
  let runStart = null;
  let runEnd = null;
  for (const y of ys) {
    if (y.salary != null) {
      if (runStart === null) runStart = y.year;
      runEnd = y.year;
    } else if (runStart !== null) {
      break; // stop at first gap
    }
  }
  const contractLengthYears = runStart != null ? runEnd - runStart + 1 : 0;
  const contractStart = runStart != null ? `${runStart}-02-01` : null;
  const contractEnd = runEnd != null ? `${runEnd + 1}-01-31` : null;

  return {
    id: `${idx + 1}`,
    name: p.name,
    team: p.team,
    salary: currentSalary,
    status: currentStatus,
    contractLengthYears,
    contractStart,
    contractEnd,
    yearlySalaries: ys,
  };
}

async function main() {
  console.log(`Scraping ${TEAMS.length} team cap sheets…`);

  const all = [];
  for (const team of TEAMS) {
    const url = `https://herhoopstats.com/salary-cap-sheet/wnba/team/${CURRENT_SEASON}/${team.slug}/`;
    console.log(`• ${team.name}`);
    try {
      const html = await fetchText(url);
      const players = parseTeamPage(html, team.name);
      console.log(`    ${players.length} players`);
      all.push(...players);
    } catch (err) {
      console.error(`  failed: ${err.message}`);
    }
    await sleep(500); // be polite
  }

  // De-dupe by (name, team) — if a player appears twice (rare), keep the
  // record with the most yearly rows of data.
  const byKey = new Map();
  for (const p of all) {
    const key = `${p.name}::${p.team}`;
    const existing = byKey.get(key);
    if (!existing || p.yearlySalaries.length > existing.yearlySalaries.length) {
      byKey.set(key, p);
    }
  }

  const records = Array.from(byKey.values()).map(toFrontendRecord);
  records.sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0));

  const payload = {
    source: "https://herhoopstats.com/salary-cap-sheet/wnba/",
    season: CURRENT_SEASON,
    lastUpdated: new Date().toISOString(),
    playerCount: records.length,
    players: records,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(
    `\nWrote ${records.length} players to ${OUT_PATH} (season ${CURRENT_SEASON}).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
