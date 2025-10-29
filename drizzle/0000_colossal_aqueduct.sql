CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'unknown' NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`distance` real NOT NULL,
	`duration` integer NOT NULL,
	`elevation_gain` real DEFAULT 0,
	`average_speed` real NOT NULL,
	`max_speed` real DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_activities_start_time` ON `activities` (`start_time`);--> statement-breakpoint
CREATE TABLE `gps_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`elevation` real,
	`timestamp` text NOT NULL,
	`sequence_order` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gps_points_activity_id` ON `gps_points` (`activity_id`);--> statement-breakpoint
CREATE INDEX `idx_gps_points_sequence` ON `gps_points` (`activity_id`,`sequence_order`);