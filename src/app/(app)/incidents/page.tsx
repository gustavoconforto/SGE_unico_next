import { requirePermission } from "@/lib/authorization";
import { and, count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  incidentsIncident as t,
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  studentsStudent as student,
} from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { incidentsIncidenttype as incidentType } from "@/db/schema/app";
import { formatGrade } from "@/lib/grades";
import { classCell, studentColumns } from "@/app/(app)/incidents/records";
import { deleteRecord } from "./actions";

export const metadata: Metadata = { title: "Ocorrências" };

export default async function RecordListPage({ searchParams }: PageProps<"/incidents">) {
  await requirePermission("incidents", "view");
  const sp = await searchParams;
  const where = and(searchWhere(param(sp, "q"), [student.name, student.socialName, incidentType.type]));
  const page = pageParam(sp);
  const from = () =>
    db
      .select({
        id: t.id,
        incidentDate: t.incidentDate,
        type: incidentType.type,
        penalty: incidentType.penalty,
        ...studentColumns,
      })
      .from(t)
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .innerJoin(incidentType, eq(t.incidentTypeId, incidentType.id));
  const [rows, [{ total }]] = await Promise.all([
    from()
      .where(where)
      .orderBy(desc(t.incidentDate), desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(t)
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .innerJoin(incidentType, eq(t.incidentTypeId, incidentType.id))
      .where(where),
  ]);
  return (
    <ListPage
      title="Ocorrências"
      newHref="/incidents/new"
      newLabel="Nova ocorrência"
      searchPlaceholder="Pesquisar por aluno..."
      headers={["Data", "Aluno", "Turma", "Tipo", "Penalidade"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[
            formatDate(r.incidentDate),
            r.student,
            classCell(r),
            r.type,
            <span key="p" className="block text-right">
              {formatGrade(r.penalty).replace(/0$/, "")}
            </span>,
          ]}
          label={`a ocorrência de ${r.student}`}
          editHref={`/incidents/${r.id}/edit`}
          deleteAction={deleteRecord.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
