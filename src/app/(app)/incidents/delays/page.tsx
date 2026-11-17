import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterDate } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { incidentsStudentdelay as t, classesClass as klass, enrollmentsEnrollment as enrollment, studentsStudent as student } from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { DELAY_TYPES } from "@/lib/incidents";
import { label } from "@/lib/finance";
import { classCell, studentColumns } from "@/app/(app)/incidents/records";
import { deleteRecord } from "./actions";

export const metadata: Metadata = { title: "Atrasos" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function RecordListPage({ searchParams }: PageProps<"/incidents/delays">) {
  const sp = await searchParams;
  const where = and(
    searchWhere(param(sp, "q"), [student.name, student.socialName]),
    DATE_RE.test(param(sp, "date_from")) ? gte(t.incidentDate, param(sp, "date_from")) : undefined,
    DATE_RE.test(param(sp, "date_to")) ? lte(t.incidentDate, param(sp, "date_to")) : undefined,
  );
  const page = pageParam(sp);
  const from = () =>
    db
      .select({ id: t.id, incidentDate: t.incidentDate, delayType: t.delayType, ...studentColumns })
      .from(t)
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id));
  const [rows, [{ total }]] = await Promise.all([
    from()
      .where(where)
      .orderBy(desc(t.incidentDate), desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(t).innerJoin(enrollment, eq(t.enrollmentId, enrollment.id)).innerJoin(student, eq(enrollment.studentId, student.id)).where(where),
  ]);
  return (
    <ListPage
      title="Atrasos"
      newHref="/incidents/delays/new"
      newLabel="Novo atraso"
      searchPlaceholder="Pesquisar por aluno..."
      filters={
        <>
          <FilterDate name="date_from" label="De" />
          <FilterDate name="date_to" label="Até" />
        </>
      }
      headers={["Data", "Aluno", "Turma", "Tipo"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[formatDate(r.incidentDate), r.student, classCell(r), label(DELAY_TYPES, r.delayType)]}
          label={`o atraso de ${r.student}`}
          editHref={`/incidents/delays/${r.id}/edit`}
          deleteAction={deleteRecord.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
