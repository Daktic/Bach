PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flights` (
	`guest_id` text NOT NULL,
	`direction` text NOT NULL,
	`leg` integer DEFAULT 0 NOT NULL,
	`flight_number` text NOT NULL,
	`airline` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`departs_at` text NOT NULL,
	`arrives_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`guest_id`, `direction`, `leg`)
);
--> statement-breakpoint
INSERT INTO `__new_flights`("guest_id", "direction", "leg", "flight_number", "airline", "origin", "destination", "departs_at", "arrives_at", "updated_at") SELECT "guest_id", "direction", 0, "flight_number", "airline", "origin", "destination", "departs_at", "arrives_at", "updated_at" FROM `flights`;--> statement-breakpoint
DROP TABLE `flights`;--> statement-breakpoint
ALTER TABLE `__new_flights` RENAME TO `flights`;--> statement-breakpoint
PRAGMA foreign_keys=ON;