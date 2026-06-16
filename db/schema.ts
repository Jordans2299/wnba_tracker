import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const players = sqliteTable(
  "players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    profileSlug: text("profile_slug").notNull(),
    league: text("league").notNull().default("wnba"),
    photoUrl: text("photo_url"),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("player_slug_league_idx").on(table.profileSlug, table.league)]
);

export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    urlSlug: text("url_slug").notNull(),
    league: text("league").notNull().default("wnba"),
    hhsSlug: text("hhs_slug"),
  },
  (table) => [
    uniqueIndex("team_name_league_idx").on(table.name, table.league),
    uniqueIndex("team_slug_league_idx").on(table.urlSlug, table.league),
  ]
);

export const teamSeasons = sqliteTable(
  "team_seasons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    season: integer("season").notNull(),
    salaryCap: integer("salary_cap"),
    totalSalaries: integer("total_salaries"),
    capRoom: integer("cap_room"),
    guaranteedSalary: integer("guaranteed_salary"),
    totalPlayers: integer("total_players"),
    openRosterSlots: integer("open_roster_slots"),
  },
  (table) => [uniqueIndex("team_season_idx").on(table.teamId, table.season)]
);

export const playerSalaries = sqliteTable(
  "player_salaries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    season: integer("season").notNull(),
    salary: integer("salary"),
    status: text("status"),
    contractStart: text("contract_start"),
    contractEnd: text("contract_end"),
    contractLengthYears: integer("contract_length_years"),
    source: text("source").default("hhs"),
  },
  (table) => [uniqueIndex("player_season_idx").on(table.playerId, table.season)]
);

export const pendingUpdates = sqliteTable("pending_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityRef: text("entity_ref").notNull(),
  league: text("league").notNull().default("wnba"),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  source: text("source").notNull(),
  status: text("status").default("pending"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  reviewedAt: text("reviewed_at"),
});
