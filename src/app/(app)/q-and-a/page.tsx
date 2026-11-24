import { requirePermission } from "@/lib/authorization";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  gradesSubject as subject,
  qAndAQanda as qa,
  studentsStudent as student,
} from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { subjectOptions } from "../grades/options";
import { classCell, studentColumns } from "../incidents/records";
import { deleteQandA } from "./actions";

export const metadata: Metadata = { title: "Plantões" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function QandAListPage({ searchParams }: PageProps<"/q-and-a">) {
  await requirePermission("qAndA", "view");
  const sp = await searchParams;
  const subjectId = Number(param(sp, "subject")) || null;
  const where = and(
    searchWhere(param(sp, "q"), [student.name, student.socialName, subject.name]),
    subjectId ? eq(qa.subjectId, subjectId) : undefined,
    DATE_RE.test(param(sp, "date_from")) ? gte(qa.qAndADate, param(sp, "date_from")) : undefined,
    DATE_RE.test(param(sp, "date_to")) ? lte(qa.qAndADate, param(sp, "date_to")) : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }], subjects] = await Promise.all([
    db
      .select({ id: qa.id, date: qa.qAndADate, subject: subject.name, ...studentColumns })
      .from(qa)
      .innerJoin(enrollment, eq(qa.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .innerJoin(subject, eq(qa.subjectId, subject.id))
      .where(where)
      .orderBy(desc(qa.qAndADate), desc(qa.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(qa)
      .innerJoin(enrollment, eq(qa.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .innerJoin(subject, eq(qa.subjectId, subject.id))
      .where(where),
    subjectOptions(),
  ]);
  return (
    <ListPage
      title="Plantões"
      newHref="/q-and-a/new"
      newLabel="Novo plantão"
      searchPlaceholder="Pesquisar por aluno ou disciplina..."
      filters={
        <>
          <FilterSelect name="subject" label="Disciplina" options={subjects.map((s) => [s.id, s.name] as const)} />
          <FilterDate name="date_from" label="De" />
          <FilterDate name="date_to" label="Até" />
        </>
      }
      headers={["Data", "Aluno", "Turma", "Disciplina"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[formatDate(r.date), r.student, classCell(r), r.subject]}
          label={`o plantão de ${r.student}`}
          editHref={`/q-and-a/${r.id}/edit`}
          deleteAction={deleteQandA.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
