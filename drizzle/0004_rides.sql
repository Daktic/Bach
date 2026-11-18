CREATE TABLE `ride_bookings` (
	`ride_id` integer NOT NULL,
	`car` integer NOT NULL,
	`kind` text NOT NULL,
	`booker_id` text NOT NULL,
	`provider` text NOT NULL,
	`riders` text NOT NULL,
	`settled` text DEFAULT '[]' NOT NULL,
	`fare_cents` integer,
	`booked_at` text NOT NULL,
	PRIMARY KEY(`ride_id`, `car`),
	FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ride_riders` (
	`ride_id` integer NOT NULL,
	`guest_id` text NOT NULL,
	`car` integer,
	`joined_at` text NOT NULL,
	PRIMARY KEY(`ride_id`, `guest_id`),
	FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_place` text NOT NULL,
	`to_place` text NOT NULL,
	`depart_at` text NOT NULL,
	`note` text,
	`plan` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
