ALTER TABLE "user" ADD COLUMN "employee_id" bigint;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees_employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_employee_id_unique" UNIQUE("employee_id");