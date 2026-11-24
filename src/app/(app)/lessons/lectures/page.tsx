import { requirePermission } from "@/lib/authorization";
import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { LinkButton } from "@/components/link-button";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  classesClass as klass,
  employeesEmployee as employee,
  gradesGradelevelsubject as levelSubject,
  gradesSubject as subject,
  lessonsLecture as lecture,
} from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { yearOptions } from "../../classes/options";
import { subjectOptions } from "../../grades/options";
import { seriesClasses } from "../data";
import { deleteLecture } from "./actions";

export const metadata: Metadata = { title: "Diário de classe" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function LectureListPage({ searchParams }: PageProps<"/lessons/lectures">) {
  await requirePermission("lessons", "view");
  const sp = await searchParams;
  const n = (k: string) => Number(param(sp, k)) || null;
  const where = and(
    searchWhere(param(sp, "q"), [lecture.topic]),
    n("school_year") ? eq(klass.yearId, n("school_year")!) : undefined,
    n("school_class") ? eq(lecture.schoolClassId, n("school_class")!) : undefined,
    n("subject") ? eq(levelSubject.subjectId, n("subject")!) : undefined,
    n("teacher") ? eq(lecture.teacherId, n("teacher")!) : undefined,
    DATE_RE.test(param(sp, "date_from")) ? gte(lecture.date, param(sp, "date_from")) : undefined,
    DATE_RE.test(param(sp, "date_to")) ? lte(lecture.date, param(sp, "date_to")) : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }], years, classes, subjects, teachers] = await Promise.all([
    db
      .select({
        id: lecture.id,
        date: lecture.date,
        period: lecture.period,
        topic: lecture.topic,
        className: klass.name,
        gradeLevel: klass.gradeLevel,
        subject: subject.name,
        teacher: employee.name,
      })
      .from(lecture)
      .innerJoin(klass, eq(lecture.schoolClassId, klass.id))
      .innerJoin(levelSubject, eq(lecture.subjectId, levelSubject.id))
      .innerJoin(subject, eq(levelSubject.subjectId, subject.id))
      .innerJoin(employee, eq(lecture.teacherId, employee.id))
      .where(where)
      .orderBy(desc(lecture.date), asc(klass.name), asc(lecture.period))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(lecture)
      .innerJoin(klass, eq(lecture.schoolClassId, klass.id))
      .innerJoin(levelSubject, eq(lecture.subjectId, levelSubject.id))
      .where(where),
    yearOptions(),
    seriesClasses(),
    subjectOptions(),
    db.select({ id: employee.id, name: employee.name }).from(employee).orderBy(asc(employee.name)),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <ListPage
        title="Diário de classe"
        searchPlaceholder="Pesquisar por conteúdo..."
        filters={
          <>
            <FilterSelect name="school_year" label="Ano letivo" options={years} allLabel="Todos" />
            <FilterSelect name="school_class" label="Turma" options={classes.map((c) => [c.id, c.label] as const)} />
            <FilterSelect name="subject" label="Matéria" options={subjects.map((s) => [s.id, s.name] as const)} />
            <FilterSelect
              name="teacher"
              label="Professor"
              options={teachers.map((t) => [t.id, t.name] as const)}
              allLabel="Todos"
            />
            <FilterDate name="date_from" label="De" />
            <FilterDate name="date_to" label="Até" />
          </>
        }
        headers={["Data", "Aula", "Turma", "Matéria", "Professor", "Conteúdo"]}
        page={page}
        total={total}
      >
        {rows.map((r) => (
          <ListRow
            key={r.id}
            cells={[
              formatDate(r.date),
              `${r.period}ª`,
              `${r.gradeLevel ? `${r.gradeLevel}º ` : ""}${r.className}`,
              r.subject,
              r.teacher,
              r.topic,
            ]}
            label={`a aula de ${formatDate(r.date)}`}
            editHref={`/lessons/lectures/${r.id}/edit`}
            deleteAction={deleteLecture.bind(null, r.id)}
          />
        ))}
      </ListPage>
      <div>
        <LinkButton href="/lessons/lectures/day">Lançamento do dia</LinkButton>
      </div>
    </div>
  );
}
