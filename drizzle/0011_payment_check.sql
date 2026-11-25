ALTER TABLE "accounts_payment" ADD COLUMN "check_number" varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_payment" ADD COLUMN "check_branch" varchar(10) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_payment" ADD COLUMN "check_account" varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_payment" ADD COLUMN "check_date" date;--> statement-breakpoint
ALTER TABLE "accounts_payment" ADD COLUMN "check_holder_name" varchar(200) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_payment" ADD COLUMN "check_holder_cpf" varchar(11) DEFAULT '' NOT NULL;