CREATE TABLE `notification_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`provider` text NOT NULL,
	`token` text NOT NULL,
	`environment` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_devices_user` ON `notification_devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `notification_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`alert` text NOT NULL,
	`family` text NOT NULL,
	`device_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`alert`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`family`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `notification_devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notification_jobs_alert` ON `notification_jobs` (`alert`);