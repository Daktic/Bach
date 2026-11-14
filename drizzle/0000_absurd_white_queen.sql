CREATE TABLE `flights` (
	`guest_id` text NOT NULL,
	`direction` text NOT NULL,
	`flight_number` text NOT NULL,
	`airline` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`departs_at` text NOT NULL,
	`arrives_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`guest_id`, `direction`)
);
--> statement-breakpoint
CREATE TABLE `guest_profiles` (
	`guest_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`avatar_data_url` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guest_travel` (
	`guest_id` text PRIMARY KEY NOT NULL,
	`driving` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'home' NOT NULL,
	`updated_at` text NOT NULL
);
