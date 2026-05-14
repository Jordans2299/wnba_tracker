CREATE TABLE `pending_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_ref` text NOT NULL,
	`field_name` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`source` text NOT NULL,
	`status` text DEFAULT 'pending',
	`created_at` text DEFAULT (datetime('now')),
	`reviewed_at` text
);
--> statement-breakpoint
CREATE TABLE `player_salaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`season` integer NOT NULL,
	`salary` integer,
	`status` text,
	`contract_start` text,
	`contract_end` text,
	`contract_length_years` integer,
	`source` text DEFAULT 'hhs',
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_season_idx` ON `player_salaries` (`player_id`,`season`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`profile_slug` text NOT NULL,
	`photo_url` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_profile_slug_unique` ON `players` (`profile_slug`);--> statement-breakpoint
CREATE TABLE `team_seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`season` integer NOT NULL,
	`salary_cap` integer,
	`total_salaries` integer,
	`cap_room` integer,
	`guaranteed_salary` integer,
	`total_players` integer,
	`open_roster_slots` integer,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_season_idx` ON `team_seasons` (`team_id`,`season`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url_slug` text NOT NULL,
	`hhs_slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_url_slug_unique` ON `teams` (`url_slug`);