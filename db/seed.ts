import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEAMS_HHS: Record<string, string> = {
  "Atlanta Dream": "atlanta-dream-11eaecc7-356c-1364-b611-2362f5011b0b",
  "Chicago Sky": "chicago-sky-11eaecc7-355f-1c4a-b611-2362f5011b0b",
  "Connecticut Sun": "connecticut-sun-11eaecc7-3562-4a0a-b611-2362f5011b0b",
  "Dallas Wings": "dallas-wings-11eaecc7-3583-13fc-b611-2362f5011b0b",
  "Golden State Valkyries": "golden-state-valkyries-11efb2ba-e2c6-f520-8806-9a93b15b3fec",
  "Indiana Fever": "indiana-fever-11eaecc7-3565-c004-b611-2362f5011b0b",
  "Las Vegas Aces": "las-vegas-aces-11eaecc7-3575-e2fe-b611-2362f5011b0b",
  "Los Angeles Sparks": "los-angeles-sparks-11eaecc7-3579-2ce8-b611-2362f5011b0b",
  "Minnesota Lynx": "minnesota-lynx-11eaecc7-357c-772c-b611-2362f5011b0b",
  "New York Liberty": "new-york-liberty-11eaecc7-356f-5524-b611-2362f5011b0b",
  "Phoenix Mercury": "phoenix-mercury-11eaecc7-357f-c1ca-b611-2362f5011b0b",
  "Portland Fire": "portland-fire-11f12f9b-e0d3-cc34-a877-9a93b15b3fec",
  "Seattle Storm": "seattle-storm-11eaecc7-3572-876c-b611-2362f5011b0b",
  "Toronto Tempo": "toronto-tempo-11f12f9b-dc63-0fe8-a877-9a93b15b3fec",
  "Washington Mystics": "washington-mystics-11eaecc7-3568-d154-b611-2362f5011b0b",
};

async function main() {
  const jsonPath = resolve(__dirname, "..", "data", "salaries.json");
  const raw = await readFile(jsonPath, "utf-8");
  const data = JSON.parse(raw);

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  console.log("Seeding teams...");
  const teamIdMap: Record<string, number> = {};
  for (const [name, summary] of Object.entries(data.teamSummaries) as [string, any][]) {
    const urlSlug = summary.urlSlug;
    const hhsSlug = TEAMS_HHS[name] ?? urlSlug;
    const result = await db
      .insert(schema.teams)
      .values({ name, urlSlug, hhsSlug })
      .onConflictDoNothing()
      .returning({ id: schema.teams.id });
    if (result.length > 0) {
      teamIdMap[name] = result[0].id;
    }
  }

  // Fetch back IDs for any that already existed
  const allTeams = await db.select().from(schema.teams);
  for (const t of allTeams) {
    teamIdMap[t.name] = t.id;
  }

  console.log("Seeding team_seasons...");
  for (const [name, summary] of Object.entries(data.teamSummaries) as [string, any][]) {
    const teamId = teamIdMap[name];
    if (!teamId) continue;
    await db
      .insert(schema.teamSeasons)
      .values({
        teamId,
        season: data.season,
        salaryCap: summary.salaryCap,
        totalSalaries: summary.totalSalaries,
        capRoom: summary.capRoom,
        guaranteedSalary: summary.guaranteedSalary,
        totalPlayers: summary.totalPlayers,
        openRosterSlots: summary.openRosterSlots,
      })
      .onConflictDoNothing();
  }

  console.log("Seeding players and salaries...");
  let count = 0;
  for (const player of data.players) {
    const playerResult = await db
      .insert(schema.players)
      .values({
        name: player.name,
        profileSlug: player.profileSlug,
        photoUrl: player.photoUrl,
      })
      .onConflictDoNothing()
      .returning({ id: schema.players.id });

    let playerId: number;
    if (playerResult.length > 0) {
      playerId = playerResult[0].id;
    } else {
      const existing = await db
        .select({ id: schema.players.id })
        .from(schema.players)
        .where(eq(schema.players.profileSlug, player.profileSlug));
      playerId = existing[0].id;
    }

    const teamId = teamIdMap[player.team];
    if (!teamId) continue;

    // Insert career earnings (historical seasons)
    const seenSeasons = new Set<number>();
    for (const entry of player.careerEarnings ?? []) {
      if (seenSeasons.has(entry.season)) continue;
      seenSeasons.add(entry.season);
      const entryTeamId = teamIdMap[entry.team] ?? teamId;
      await db
        .insert(schema.playerSalaries)
        .values({
          playerId,
          teamId: entryTeamId,
          season: entry.season,
          salary: entry.salary,
          status: entry.status,
          contractStart: entry.season === data.season ? player.contractStart : null,
          contractEnd: entry.season === data.season ? player.contractEnd : null,
          contractLengthYears:
            entry.season === data.season ? player.contractLengthYears : null,
          source: "hhs",
        })
        .onConflictDoNothing();
    }

    // Insert future years from yearlySalaries that aren't already covered
    for (const ys of player.yearlySalaries ?? []) {
      if (seenSeasons.has(ys.year)) continue;
      if (ys.salary == null) continue;
      seenSeasons.add(ys.year);
      await db
        .insert(schema.playerSalaries)
        .values({
          playerId,
          teamId,
          season: ys.year,
          salary: ys.salary,
          status: ys.status,
          source: "hhs",
        })
        .onConflictDoNothing();
    }

    count++;
    if (count % 50 === 0) console.log(`  ...${count} players`);
  }

  console.log(`Done! Seeded ${count} players, ${Object.keys(teamIdMap).length} teams.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
