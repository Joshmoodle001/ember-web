CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`contact_name` text NOT NULL,
	`business_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`need` text DEFAULT '' NOT NULL,
	`timing` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'direct' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_status_created_idx` ON `leads` (`status`,`created_at`);