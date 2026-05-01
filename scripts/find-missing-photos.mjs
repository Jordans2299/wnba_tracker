#!/usr/bin/env node
/**
 * Fetch photo URLs for players currently missing them in data/salaries.json.
 *
 * Sources tried in order:
 *  1. ESPN team rosters (existing approach — by normalized name match)
 *  2. WNBA stats API → CDN headshots (filters out placeholder images <8KB)
 *
 * Writes matched slugs → photoUrl to data/photo-overrides.json.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SALARIES_PATH = resolve(__dirname, "..", "data", "salaries.json");
const OVERRIDES_PATH = resolve(__dirname, "..", "data", "photo-overrides.json");

const WNBA_PHOTO_CDN = (id) =>
  `https://cdn.wnba.com/headshots/wnba/latest/260x190/${id}.png`;
const REAL_PHOTO_MIN_BYTES = 8_000; // placeholder silhouette is ~4KB

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastName(n) { return n.trim().split(" ").at(-1); }
function firstInitial(n) { return n.trim()[0] ?? ""; }

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "application/json",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function hasRealPhoto(url) {
  try {
    const r = await fetch(url, {
      method: "HEAD",
      headers: { "user-agent": "Mozilla/5.0", "Referer": "https://www.wnba.com/" },
    });
    if (!r.ok) return false;
    const len = parseInt(r.headers.get("content-length") ?? "0", 10);
    return len >= REAL_PHOTO_MIN_BYTES;
  } catch {
    return false;
  }
}

async function main() {
  const salaries = JSON.parse(await readFile(SALARIES_PATH, "utf8"));
  const missing = salaries.players.filter((p) => !p.photoUrl && p.salary > 0);
  console.log(`Players missing photos: ${missing.length}\n`);

  // ── Source 1: ESPN team rosters ────────────────────────────────────────────
  console.log("Source 1: ESPN team rosters…");
  const teamsData = await fetchJson(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams?limit=30"
  );
  const espnTeams = teamsData?.sports?.[0]?.leagues?.[0]?.teams ?? [];

  // Build lookup maps: exact / last+initial / last-only
  const byExact = new Map();
  const byLFI = new Map(); // last+firstInitial → {url, count}
  const byLast = new Map(); // lastName → {url, count}

  for (const { team } of espnTeams) {
    try {
      const roster = await fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${team.id}/roster`
      );
      for (const a of roster?.athletes ?? []) {
        const raw = a.fullName || a.displayName || "";
        if (!raw || !a.headshot?.href) continue;
        const url = a.headshot.href.replace(
          /\/i\/headshots\/wnba\/players\/full\//,
          "/combiner/i?img=/i/headshots/wnba/players/full/"
        );
        const norm = normalizeName(raw);
        byExact.set(norm, url);
        const lfi = `${lastName(norm)} ${firstInitial(norm)}`;
        const lfiE = byLFI.get(lfi) ?? { url, count: 0 };
        byLFI.set(lfi, { url, count: lfiE.count + 1 });
        const ln = lastName(norm);
        const lnE = byLast.get(ln) ?? { url, count: 0 };
        byLast.set(ln, { url, count: lnE.count + 1 });
      }
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      console.warn(`  ESPN team ${team.id}: ${e.message}`);
    }
  }

  const espnOverrides = {};
  for (const player of missing) {
    const norm = normalizeName(player.name);
    let found = byExact.get(norm);
    if (!found) {
      const lfi = `${lastName(norm)} ${firstInitial(norm)}`;
      const e = byLFI.get(lfi);
      if (e?.count === 1) found = e.url;
    }
    if (!found) {
      const e = byLast.get(lastName(norm));
      if (e?.count === 1) found = e.url;
    }
    if (found) espnOverrides[player.profileSlug] = found;
  }
  console.log(`  Matched ${Object.keys(espnOverrides).length} via ESPN\n`);

  // ── Source 2: WNBA stats API → CDN ────────────────────────────────────────
  const stillMissing = missing.filter((p) => !espnOverrides[p.profileSlug]);
  console.log(`Source 2: WNBA stats API for ${stillMissing.length} remaining players…`);

  const wnbaData = await fetchJson(
    "https://stats.wnba.com/stats/commonallplayers?LeagueID=10&Season=2025-26&IsOnlyCurrentSeason=0",
    { Referer: "https://www.wnba.com/", Origin: "https://www.wnba.com" }
  );
  const wnbaRows = wnbaData.resultSets?.[0]?.rowSet ?? [];

  // Build WNBA lookup: normalized display name → player ID
  const wnbaByExact = new Map();
  const wnbaByLFI = new Map();
  const wnbaByLast = new Map();

  for (const row of wnbaRows) {
    const id = row[0];
    const displayName = row[2] ?? "";
    if (!id || !displayName) continue;
    const norm = normalizeName(displayName);
    wnbaByExact.set(norm, id);
    const lfi = `${lastName(norm)} ${firstInitial(norm)}`;
    const lfiE = wnbaByLFI.get(lfi) ?? { id, count: 0 };
    wnbaByLFI.set(lfi, { id, count: lfiE.count + 1 });
    const ln = lastName(norm);
    const lnE = wnbaByLast.get(ln) ?? { id, count: 0 };
    wnbaByLast.set(ln, { id, count: lnE.count + 1 });
  }

  const wnbaOverrides = {};
  const toVerify = []; // [{ slug, url }] to HEAD-check in parallel batches

  for (const player of stillMissing) {
    const norm = normalizeName(player.name);
    let wnbaId = wnbaByExact.get(norm);
    if (!wnbaId) {
      const lfi = `${lastName(norm)} ${firstInitial(norm)}`;
      const e = wnbaByLFI.get(lfi);
      if (e?.count === 1) wnbaId = e.id;
    }
    if (!wnbaId) {
      const e = wnbaByLast.get(lastName(norm));
      if (e?.count === 1) wnbaId = e.id;
    }
    if (wnbaId) {
      toVerify.push({ slug: player.profileSlug, name: player.name, url: WNBA_PHOTO_CDN(wnbaId) });
    }
  }

  console.log(`  Found WNBA IDs for ${toVerify.length} players, verifying headshots…`);

  // Verify in batches of 10
  const BATCH = 10;
  for (let i = 0; i < toVerify.length; i += BATCH) {
    const batch = toVerify.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ slug, name, url }) => {
        const real = await hasRealPhoto(url);
        if (real) {
          wnbaOverrides[slug] = url;
          console.log(`  ✓ ${name}`);
        } else {
          console.log(`  ✗ ${name} (no real headshot on WNBA CDN)`);
        }
      })
    );
  }
  console.log(`  Matched ${Object.keys(wnbaOverrides).length} via WNBA CDN\n`);

  // ── Merge and write ────────────────────────────────────────────────────────
  let existing = {};
  try { existing = JSON.parse(await readFile(OVERRIDES_PATH, "utf8")); } catch { /* first run */ }

  const merged = { ...existing, ...espnOverrides, ...wnbaOverrides };
  await writeFile(OVERRIDES_PATH, JSON.stringify(merged, null, 2) + "\n", "utf8");

  const newCount = Object.keys(merged).length - Object.keys(existing).length;
  console.log(`Total overrides: ${Object.keys(merged).length} (+${newCount} new)`);
  console.log(`Written to data/photo-overrides.json`);

  // Summary of still-unmatched
  const allFound = { ...espnOverrides, ...wnbaOverrides };
  const unmatched = stillMissing.filter((p) => !wnbaOverrides[p.profileSlug]);
  if (unmatched.length) {
    console.log(`\nStill no headshot available (${unmatched.length}):`);
    for (const p of unmatched) console.log(`  - ${p.name} (${p.team})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
