import { Alert } from "flowbite-react";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment } from "@/db/schema/app";
import { isAttendanceStatus } from "@/lib/attendance";
import { requirePermission } from "@/lib/authorization";
import { formatDate } from "@/lib/finance";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "../../enrollments/data";
import { EnrollmentPicker } from "../../grades/student/enrollment-picker";
import { excuseError, rollCall, rollCallDateError } from "../attendance/data";
import { RollCallSheet } from "../attendance/roll-call-sheet";
import { seriesClass } from "../data";

export const metadata: Metadata = { title: "Abono de faltas" };

export default async function ExcusedAbsencesPage({ searchParams }: PageProps<"/lessons/excused-absences">) {
  await requirePermission("attendance", "edit");
  await connection();
  const [options, sp] = await Promise.all([activeEnrollmentOptions(), searchParams]);
  const id = options.find(([x]) => x === Number(param(sp, "enrollment")))?.[0] ?? null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param(sp, "date")) ? param(sp, "date") : "";
  const [row] = id
    ? await db.select({ classId: enrollment.schoolClassId }).from(enrollment).where(eq(enrollment.id, id))
    : [];
  const c = row?.classId ? await seriesClass(row.classId) : null;
  const dateError = c && date ? await rollCallDateError(c, date) : null;
  const day = c && date && !dateError ? await rollCall(c, date) : null;
  const student = day?.students.find((s) => s.id === id);
  const saved = day?.saved.filter((a) => a.enrollmentId === id) ?? [];
  const excuse = day && id ? excuseError(day, id) : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Abono de faltas</h1>
      <EnrollmentPicker options={options} value={id} date={date} />
      {!id || !date ? (
        <p className="text-gray-500">Selecione o aluno e a data.</p>
      ) : !c ? (
        <Alert color="warning">O aluno não está numa turma com aulas.</Alert>
      ) : dateError ? (
        <Alert color="failure">{dateError}</Alert>
      ) : excuse || !student || !day ? (
        <Alert color="warning">{excuse ?? "Não há chamada registrada para o aluno nesta data."}</Alert>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {formatDate(date)} · {c.label}
          </p>
          <RollCallSheet
            key={`${id}-${date}`}
            classId={c.id}
            date={date}
            enrollmentId={id}
            cancelHref="/lessons/excused-absences"
            lessons={day.columns.map(({ period, label, subject }) => ({ period, label, subject }))}
            students={[
              {
                id: student.id,
                name: student.name,
                statuses: Object.fromEntries(
                  saved.flatMap((a) => (isAttendanceStatus(a.status) ? [[a.period, a.status] as const] : [])),
                ),
                note: day.notes.find((n) => n.enrollmentId === id)?.note ?? "",
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
