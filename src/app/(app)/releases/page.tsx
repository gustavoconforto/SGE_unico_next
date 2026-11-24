import { requirePermission } from "@/lib/authorization";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  releasesEarlyexit as t,
  releasesExitreason as reason,
  studentsStudent as student,
} from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { classCell, studentColumns } from "@/app/(app)/incidents/records";
import { reasonOptions } from "./reasons/options";
import { deleteExit } from "./actions";

export const metadata: Metadata = { title: "Liberações" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ExitListPage({ searchParams }: PageProps<"/releases">) {
  await requirePermission("releases", "view");
  const sp = await searchParams;
  const reasonId = Number(param(sp, "reason"));
  const where = and(
    searchWhere(param(sp, "q"), [student.name, student.socialName]),
    DATE_RE.test(param(sp, "date_from")) ? gte(t.exitDate, param(sp, "date_from")) : undefined,
    DATE_RE.test(param(sp, "date_to")) ? lte(t.exitDate, param(sp, "date_to")) : undefined,
    Number.isSafeInteger(reasonId) && reasonId > 0 ? eq(t.reasonId, reasonId) : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }], reasons] = await Promise.all([
    db
      .select({ id: t.id, exitDate: t.exitDate, reason: reason.reason, ...studentColumns })
      .from(t)
      .innerJoin(reason, eq(t.reasonId, reason.id))
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .where(where)
      .orderBy(desc(t.exitDate), desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(t)
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .where(where),
    reasonOptions(),
  ]);
  return (
    <ListPage
      title="Liberações"
      newHref="/releases/new"
      newLabel="Nova liberação"
      searchPlaceholder="Pesquisar por aluno..."
      filters={
        <>
          <FilterDate name="date_from" label="De" />
          <FilterDate name="date_to" label="Até" />
          <FilterSelect name="reason" label="Motivo" options={reasons} allLabel="Todos" />
        </>
      }
      headers={["Data", "Aluno", "Turma", "Motivo"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[formatDate(r.exitDate), r.student, classCell(r), r.reason]}
          label={`a liberação de ${r.student}`}
          editHref={`/releases/${r.id}/edit`}
          deleteAction={deleteExit.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
