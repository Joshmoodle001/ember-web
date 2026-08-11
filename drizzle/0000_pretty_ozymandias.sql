CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_name` text NOT NULL,
	`business_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`kind` text NOT NULL,
	`package_name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`billing_day` integer,
	`due_date` text NOT NULL,
	`payment_code` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payfast_payment_id` text,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_requests_code_unique` ON `payment_requests` (`payment_code`);--> statement-breakpoint
CREATE INDEX `payment_requests_client_due_idx` ON `payment_requests` (`client_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `payment_requests_open_due_idx` ON `payment_requests` (`status`,`due_date`);