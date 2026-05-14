#!/usr/bin/env npx tsx
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import * as schema from "../db/schema";

const CURRENT_SEASON = 2026;
const MAX_PLAYERS_PER_RUN = 50;
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function braveSearch(query: string): Promise<string[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY not set");

  const url = new URL(BRAVE_API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("freshness", "pm"); // past month

  const res = await fetch(url.toString(), {
    headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);

  const data = await res.json();
  const results = data.web?.results ?? [];
  return results.map((r: any) => `${r.title}: ${r.description}`).slice(0, 5);
}

async function extractSalaryWithAI(
  client: Anthropic,
  playerName: string,
  team: string,
  season: number,
  snippets: string[]
): Promise<{ salary: number; status: string | null } | null> {
  const content = snippets.join("\n\n");
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `From the following search result snippets, extract the ${season} WNBA salary for ${playerName} (${team}).

Return ONLY valid JSON in this exact format, or null if no salary info found:
{"salary": <number in dollars>, "status": "<contract status or null>"}

Snippets:
${content}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

  if (text === "null" || !text) return null;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.salary === "number" && parsed.salary > 0) {
      return { salary: parsed.salary, status: parsed.status ?? null };
    }
  } catch {
    // Try to extract JSON from response
    const match = text.match(/\{[^}]+\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.salary === "number" && parsed.salary > 0) {
          return { salary: parsed.salary, status: parsed.status ?? null };
        }
      } catch { /* give up */ }
    }
  }

  return null;
}

export async function runSearch() {
  if (!process.env.BRAVE_API_KEY) {
    console.log("BRAVE_API_KEY not set, skipping web search");
    return 0;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY not set, skipping AI extraction");
    return 0;
  }

  const dbClient = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(dbClient, { schema });
  const anthropic = new Anthropic();

  const allPlayers = await db.select().from(schema.players);
  const allSalaries = await db.select().from(schema.playerSalaries);
  const teams = await db.select().from(schema.teams);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const salaryByPlayerSeason = new Map<string, typeof allSalaries[0]>();
  for (const s of allSalaries) {
    salaryByPlayerSeason.set(`${s.playerId}:${s.season}`, s);
  }

  // Pick players to search: those with current-season salary data (most likely to have updates)
  const candidates = allPlayers
    .filter((p) => {
      const salary = salaryByPlayerSeason.get(`${p.id}:${CURRENT_SEASON}`);
      return salary && salary.salary && salary.salary > 0;
    })
    .slice(0, MAX_PLAYERS_PER_RUN);

  console.log(`\n=== Web search for ${candidates.length} players ===`);
  let pendingCount = 0;

  for (const player of candidates) {
    const currentSalary = salaryByPlayerSeason.get(`${player.id}:${CURRENT_SEASON}`);
    if (!currentSalary) continue;

    const team = teamMap.get(currentSalary.teamId);
    const teamName = team?.name ?? "WNBA";

    try {
      const query = `"${player.name}" WNBA salary ${CURRENT_SEASON}`;
      const snippets = await braveSearch(query);

      if (snippets.length === 0) {
        await sleep(500);
        continue;
      }

      const extracted = await extractSalaryWithAI(
        anthropic, player.name, teamName, CURRENT_SEASON, snippets
      );

      if (extracted && extracted.salary !== currentSalary.salary) {
        const entityRef = `${player.profileSlug}:${CURRENT_SEASON}`;
        await db.insert(schema.pendingUpdates).values({
          entityType: "player_salary",
          entityRef,
          fieldName: "salary",
          oldValue: String(currentSalary.salary),
          newValue: String(extracted.salary),
          source: "web_search",
          status: "pending",
        });
        pendingCount++;
        console.log(`  ${player.name}: ${currentSalary.salary} -> ${extracted.salary} (web_search)`);
      }

      await sleep(500);
    } catch (err: any) {
      console.log(`  ${player.name}: search failed (${err.message})`);
    }
  }

  console.log(`\nWeb search complete: ${pendingCount} pending updates created`);
  return pendingCount;
}

const isMain = process.argv[1]?.endsWith("search-salaries.ts") || process.argv[1]?.endsWith("search-salaries.js");
if (isMain) {
  runSearch().catch((err) => { console.error(err); process.exit(1); });
}
