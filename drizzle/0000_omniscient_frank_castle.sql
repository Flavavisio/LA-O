CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text NOT NULL,
	`member` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created` text NOT NULL,
	`acknowledged_by` text,
	`acknowledged_at` text,
	FOREIGN KEY (`family`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`seats` integer NOT NULL,
	`expires` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`user_id` text,
	`role` text DEFAULT 'member' NOT NULL,
	`is_primary` integer DEFAULT 0 NOT NULL,
	`adult` integer DEFAULT 1 NOT NULL,
	`relation` text NOT NULL,
	`consent` integer DEFAULT 0 NOT NULL,
	`consent_at` text,
	`consent_by` text,
	`lat` real,
	`lng` real,
	`accuracy` real,
	`speed` real,
	`updated` text,
	`created` text NOT NULL,
	FOREIGN KEY (`family`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_email` ON `members` (`family`,`email`);--> statement-breakpoint
CREATE TABLE `system` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner` text NOT NULL
);
