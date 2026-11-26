ALTER TABLE "user" ADD COLUMN "student_id" bigint;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_student_id_students_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students_student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_student_id_unique" UNIQUE("student_id");