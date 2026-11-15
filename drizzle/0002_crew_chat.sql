CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_messages_client_id_unique` ON `chat_messages` (`client_id`);--> statement-breakpoint
CREATE INDEX `chat_messages_guest_time` ON `chat_messages` (`guest_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `chat_reads` (
	`guest_id` text PRIMARY KEY NOT NULL,
	`last_read_id` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guest_presence` (
	`guest_id` text PRIMARY KEY NOT NULL,
	`last_seen_at` text NOT NULL
);
