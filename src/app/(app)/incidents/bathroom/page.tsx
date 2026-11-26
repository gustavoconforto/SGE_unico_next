import { requirePermission } from "@/lib/authorization";
import { and, count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  incidentsBathroompermission as t,
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  studentsStudent as student,
} from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";

import { classCell, studentColumns } from "@/app/(app)/incidents/records";
import { deleteRecord } from "./actions";

export const metadata: Metadata = { title: "Saídas para banheiro" };

export default async function RecordListPage({ searchParams }: PageProps<"/incidents/bathroom">) {
  await requirePermission("incidents", "view");
  const sp = await searchParams;
  const where = and(searchWhere(param(sp, "q"), [student.name, student.socialName]));
  const page = pageParam(sp);
  const from = () =>
    db
      .select({ id: t.id, incidentDate: t.incidentDate, classPeriod: t.classPeriod, ...studentColumns })
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
    db
      .select({ total: count() })
      .from(t)
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .where(where),
  ]);
  return (
    <ListPage
      title="Saídas para banheiro"
      newHref="/incidents/bathroom/new"
      newLabel="Nova saída para banheiro"
      actions={
        <LinkButton href="/incidents/bathroom/batch" color="alternative">
          Lançar em lote
        </LinkButton>
      }
      searchPlaceholder="Pesquisar por aluno..."
      headers={["Data", "Aluno", "Turma", "Horário"]}
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
            <span key="h" className="block text-right">
              {r.classPeriod}º
            </span>,
          ]}
          label={`a saída de ${r.student}`}
          editHref={`/incidents/bathroom/${r.id}/edit`}
          deleteAction={deleteRecord.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
