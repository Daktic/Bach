-- Rides were rebuilt around cars with seats before anyone used them: a
-- rider's `car` and a booking's `car` used to be a position in the ride's
-- plan and are now a ride_cars id, so whatever 0004 holds is cleared rather
-- than carried over.
DELETE FROM `ride_riders`;--> statement-breakpoint
DELETE FROM `ride_bookings`;--> statement-breakpoint
CREATE TABLE `ride_cars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ride_id` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `ride_riders` ADD `seat` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `ride_riders_seat` ON `ride_riders` (`ride_id`,`car`,`seat`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dest_name` text NOT NULL,
	`dest_address` text DEFAULT '' NOT NULL,
	`dest_lat` real NOT NULL,
	`dest_lng` real NOT NULL,
	`depart_at` text,
	`note` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
DROP TABLE `rides`;--> statement-breakpoint
ALTER TABLE `__new_rides` RENAME TO `rides`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
