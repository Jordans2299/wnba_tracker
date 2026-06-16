#!/usr/bin/env node
// One-off, idempotent, ADDITIVE migration for the production Turso DB:
//   - add `league` column (default 'wnba') to players, teams, pending_updates
//   - replace the global unique index on players.profile_slug with a
//     league-scoped composite unique index
// No table rebuilds - safe to run against production.
import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

// Load .env.local
const env = {};
try {
  const raw = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const url = process.env.TURSO_DATABASE_URL ?? env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN ?? env.TURSO_AUTH_TOKEN;
if (!url) throw new Error("TURSO_DATABASE_URL not found");
console.log("Target:", url);

const client = createClient({ url, authToken });

async function hasColumn(table, col) {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((r) => r.name === col);
}

async function addLeague(table) {
  if (await hasColumn(table, "league")) {
    console.log(`  ${table}.league already exists - skipping`);
    return;
  }
  await client.execute(
    `ALTER TABLE ${table} ADD COLUMN league text NOT NULL DEFAULT 'wnba'`
  );
  console.log(`  ${table}.league added`);
}

console.log("\nAdding league columns...");
await addLeague("players");
await addLeague("teams");
await addLeague("pending_updates");

console.log("\nSwapping players unique index...");
await client.execute(`DROP INDEX IF EXISTS players_profile_slug_unique`);
await client.execute(
  `CREATE UNIQUE INDEX IF NOT EXISTS player_slug_league_idx ON players (profile_slug, league)`
);
console.log("  player_slug_league_idx ready");

// Verify
const counts = await client.execute(
  `SELECT league, count(*) AS n FROM players GROUP BY league`
);
console.log("\nplayers by league:", counts.rows.map((r) => `${r.league}=${r.n}`).join(", "));
console.log("\nDone.");
