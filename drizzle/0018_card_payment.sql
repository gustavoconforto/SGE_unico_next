ALTER TABLE "accounts_payment" ADD COLUMN "card_brand" varchar(3) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_payment" ADD COLUMN "card_receipt" varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_payment" ADD COLUMN "card_installments" smallint;