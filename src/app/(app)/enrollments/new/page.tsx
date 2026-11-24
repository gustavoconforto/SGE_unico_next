import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { param } from "@/lib/list";
import { classOptions, discountTypeOptions, enrollmentTypeOptions, studentOptions } from "../data";
import { EnrollmentNewForm } from "../enrollment-new-form";

export const metadata: Metadata = { title: "Nova matrícula" };

export default async function NewEnrollmentPage({ searchParams }: PageProps<"/enrollments/new">) {
  await requirePermission("enrollments", "edit");
  // ?student=<id>: "Matricular" on the student's page arrives with the student already chosen
  const studentId = Number(param(await searchParams, "student")) || null;
  const [students, types, classes, discountTypes] = await Promise.all([
    studentOptions(),
    enrollmentTypeOptions(),
    classOptions(),
    discountTypeOptions(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova matrícula</h1>
      <EnrollmentNewForm
        studentId={students.some(([id]) => id === studentId) ? studentId : null}
        students={students}
        types={types}
        classes={classes}
        discountTypes={discountTypes}
      />
    </div>
  );
}
