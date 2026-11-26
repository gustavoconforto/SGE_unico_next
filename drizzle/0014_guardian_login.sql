ALTER TABLE "user" ADD COLUMN "guardian_id" bigint;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_guardian_id_students_guardian_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."students_guardian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_guardian_id_unique" UNIQUE("guardian_id");