CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_address` text NOT NULL,
	`mint` text,
	`auditor_address` text NOT NULL,
	`auditor_elgamal_pubkey` text,
	`mint_signature` text,
	`claim_token` text,
	`claim_label` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `companies_owner_idx` ON `companies` (`owner_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `companies_claim_idx` ON `companies` (`claim_token`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`role` text,
	`note` text,
	`amount` text NOT NULL,
	`wallet_address` text,
	`invite_token` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`configured_signature` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`activated_at` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_invite_idx` ON `employees` (`invite_token`);--> statement-breakpoint
CREATE INDEX `employees_company_idx` ON `employees` (`company_id`);--> statement-breakpoint
CREATE INDEX `employees_wallet_idx` ON `employees` (`wallet_address`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`amount` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`signature` text,
	`signatures` text,
	`error` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`paid_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `payroll_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_run_idx` ON `payments` (`run_id`);--> statement-breakpoint
CREATE INDEX `payments_employee_idx` ON `payments` (`employee_id`);--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`period` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`total` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `runs_company_idx` ON `payroll_runs` (`company_id`);