import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  const pending = await db
    .select()
    .from(schema.pendingUpdates)
    .where(eq(schema.pendingUpdates.status, "pending"))
    .orderBy(schema.pendingUpdates.createdAt);

  return NextResponse.json(pending);
}

export async function POST(request: NextRequest) {
  const { id, action } = await request.json();

  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [update] = await db
    .select()
    .from(schema.pendingUpdates)
    .where(eq(schema.pendingUpdates.id, id));

  if (!update) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
  }

  if (action === "approve") {
    // Apply the change to the relevant table
    if (update.entityType === "player_salary") {
      const [slug, seasonStr] = update.entityRef.split(":");
      const season = parseInt(seasonStr, 10);

      // Find the player
      const [player] = await db
        .select()
        .from(schema.players)
        .where(eq(schema.players.profileSlug, slug));

      if (player) {
        const fieldMap: Record<string, string> = {
          salary: "salary",
          status: "status",
          contract_start: "contractStart",
          contract_end: "contractEnd",
          contract_length_years: "contractLengthYears",
        };

        const dbField = fieldMap[update.fieldName];
        if (dbField) {
          const value = update.newValue;
          const numericFields = ["salary", "contractLengthYears"];
          const updateValue = numericFields.includes(dbField) && value != null
            ? parseInt(value, 10)
            : value;

          await db
            .update(schema.playerSalaries)
            .set({ [dbField]: updateValue })
            .where(
              and(
                eq(schema.playerSalaries.playerId, player.id),
                eq(schema.playerSalaries.season, season)
              )
            );
        }
      }
    } else if (update.entityType === "team_season") {
      const [teamSlug, seasonStr] = update.entityRef.split(":");
      const season = parseInt(seasonStr, 10);

      const [team] = await db
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.urlSlug, teamSlug));

      if (team) {
        const fieldMap: Record<string, string> = {
          salary_cap: "salaryCap",
          total_salaries: "totalSalaries",
          cap_room: "capRoom",
          guaranteed_salary: "guaranteedSalary",
          total_players: "totalPlayers",
          open_roster_slots: "openRosterSlots",
        };

        const dbField = fieldMap[update.fieldName];
        if (dbField) {
          const value = update.newValue != null ? parseInt(update.newValue, 10) : null;
          await db
            .update(schema.teamSeasons)
            .set({ [dbField]: value })
            .where(
              and(
                eq(schema.teamSeasons.teamId, team.id),
                eq(schema.teamSeasons.season, season)
              )
            );
        }
      }
    }
  }

  // Mark the update as approved/rejected
  await db
    .update(schema.pendingUpdates)
    .set({
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt: new Date().toISOString(),
    })
    .where(eq(schema.pendingUpdates.id, id));

  return NextResponse.json({ ok: true });
}
