DROP INDEX `players_profile_slug_unique`;--> statement-breakpoint
ALTER TABLE `players` ADD `league` text DEFAULT 'wnba' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `player_slug_league_idx` ON `players` (`profile_slug`,`league`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url_slug` text NOT NULL,
	`league` text DEFAULT 'wnba' NOT NULL,
	`hhs_slug` text
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "name", "url_slug", "league", "hhs_slug") SELECT "id", "name", "url_slug", "league", "hhs_slug" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `team_name_league_idx` ON `teams` (`name`,`league`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_slug_league_idx` ON `teams` (`url_slug`,`league`);--> statement-breakpoint
ALTER TABLE `pending_updates` ADD `league` text DEFAULT 'wnba' NOT NULL;