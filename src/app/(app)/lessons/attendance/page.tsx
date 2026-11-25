import { requirePermission } from "@/lib/authorization";
import { Alert } from "flowbite-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { isAttendanceStatus } from "@/lib/attendance";
import { formatDate } from "@/lib/finance";
import { param } from "@/lib/list";
import { ClassDatePicker } from "../class-picker";
import { seriesClasses } from "../data";
import { rollCall, rollCallDateError } from "./data";
import { RollCallSheet } from "./roll-call-sheet";

export const metadata: Metadata = { title: "Chamada da turma" };

export default async function RollCallPage({ searchParams }: PageProps<"/lessons/attendance">) {
  await requirePermission("attendance", "edit");
  await connection();
  const [classes, sp] = await Promise.all([seriesClasses(), searchParams]);
  const c = classes.find((x) => x.id === Number(param(sp, "school_class"))) ?? null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param(sp, "date")) ? param(sp, "date") : "";
  const dateError = c && date ? await rollCallDateError(c, date) : null;
  const day = c && date && !dateError ? await rollCall(c, date) : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Chamada da turma</h1>
      <ClassDatePicker classes={classes.map((x) => [x.id, x.label])} classId={c?.id ?? null} date={date} withDate />
      {dateError && <Alert color="failure">{dateError}</Alert>}
      {!day ? (
        !dateError && <p className="text-gray-500">Selecione a turma e a data.</p>
      ) : !day.columns.length ? (
        <Alert color="warning">
          A turma não tem aulas neste dia. Monte a grade horária ou lance as aulas no diário de classe.
        </Alert>
      ) : !day.students.length ? (
        <Alert color="warning">A turma não tem alunos matriculados nesta data.</Alert>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {formatDate(date)} ·{" "}
            {day.saved.length ? "Chamada salva; altere e salve de novo se precisar." : "Chamada ainda não feita."}
          </p>
          <RollCallSheet
            key={`${c!.id}-${date}`}
            classId={c!.id}
            date={date}
            cancelHref="/lessons/attendance"
            lessons={day.columns.map(({ period, label, subject }) => ({ period, label, subject }))}
            students={day.students.map((s) => ({
              id: s.id,
              name: s.name,
              statuses: Object.fromEntries(
                day.saved.flatMap((a) =>
                  a.enrollmentId === s.id && isAttendanceStatus(a.status) ? [[a.period, a.status] as const] : [],
                ),
              ),
              note: day.notes.find((n) => n.enrollmentId === s.id)?.note ?? "",
            }))}
          />
        </>
      )}
    </div>
  );
}
