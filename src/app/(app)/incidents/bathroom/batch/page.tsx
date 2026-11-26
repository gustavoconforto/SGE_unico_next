import { requirePermission } from "@/lib/authorization";
import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment, studentsStudent as student } from "@/db/schema/app";
import { classOptions, studentName } from "@/app/(app)/enrollments/data";
import { today } from "@/lib/finance";
import { param } from "@/lib/list";
import { BatchBathroomForm } from "./batch-form";

export const metadata: Metadata = { title: "Saídas para banheiro em lote" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Step 1 (in the URL): date and class. Step 2: check each student's periods and save. */
export default async function BatchBathroomPage({ searchParams }: PageProps<"/incidents/bathroom/batch">) {
  await requirePermission("incidents", "edit");
  const sp = await searchParams;
  if (!Object.keys(sp).length) redirect(`/incidents/bathroom/batch?date=${today()}`);
  const classes = await classOptions();
  const date = DATE_RE.test(param(sp, "date")) ? param(sp, "date") : null;
  const classId = classes.find((c) => String(c.id) === param(sp, "school_class"))?.id ?? null;
  const students =
    date && classId
      ? (
          await db
            .select({ id: enrollment.id, name: studentName })
            .from(enrollment)
            .innerJoin(student, eq(enrollment.studentId, student.id))
            .where(and(eq(enrollment.schoolClassId, classId), eq(enrollment.status, "A")))
            .orderBy(asc(studentName))
        ).map((s): [number, string] => [s.id, s.name])
      : null;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Saídas para banheiro em lote</h1>
      <div className="flex flex-wrap items-end gap-3">
        <Suspense>
          <FilterDate name="date" label="Data" />
          <FilterSelect
            name="school_class"
            label="Turma"
            options={classes.map((c) => [c.id, c.label] as const)}
            allLabel="Selecione"
          />
        </Suspense>
      </div>
      {students ? (
        <BatchBathroomForm
          key={`${date}:${classId}`}
          incidentDate={date!}
          schoolClassId={classId!}
          students={students}
        />
      ) : (
        <p className="text-sm text-gray-700">Escolha a data e a turma para ver os alunos.</p>
      )}
    </div>
  );
}
