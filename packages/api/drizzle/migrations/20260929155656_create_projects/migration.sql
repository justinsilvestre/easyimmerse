CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`target_language` text NOT NULL,
	`created_at` integer NOT NULL
);
