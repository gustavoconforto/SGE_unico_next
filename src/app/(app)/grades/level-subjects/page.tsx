import { and, asc, count, eq, exists, ilike, inArray, or } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterSelect } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  employeesEmployee as employee,
  gradesGradelevelsubject as levelSubject,
  gradesGradelevelsubjectTeachers as levelSubjectTeachers,
  gradesSubject as subject,
} from "@/db/schema/app";
import { formatMoney, label } from "@/lib/finance";
import { GRADE_LEVELS } from "@/lib/grades";
import { PAGE_SIZE, likePattern, pageParam, param } from "@/lib/list";
import { ref } from "@/lib/sql";
import { deleteLevelSubject } from "./actions";

export const metadata: Metadata = { title: "Matérias por série" };

export default async function LevelSubjectListPage({ searchParams }: PageProps<"/grades/level-subjects">) {
  const sp = await searchParams;
  const q = param(sp, "q");
  const level = Number(param(sp, "grade_level"));
  const p = likePattern(q);
  const where = and(
    [1, 2, 3].includes(level) ? eq(levelSubject.gradeLevel, level) : undefined,
    q
      ? or(
          ilike(subject.name, p),
          exists(
            db
              .select()
              .from(levelSubjectTeachers)
              .innerJoin(employee, eq(levelSubjectTeachers.employeeId, employee.id))
              .where(and(eq(levelSubjectTeachers.gradelevelsubjectId, ref(levelSubject.id)), ilike(employee.name, p))),
          ),
        )
      : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: levelSubject.id, gradeLevel: levelSubject.gradeLevel, weeklyClasses: levelSubject.weeklyClasses, subject: subject.name })
      .from(levelSubject)
      .innerJoin(subject, eq(levelSubject.subjectId, subject.id))
      .where(where)
      .orderBy(asc(levelSubject.gradeLevel), asc(subject.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(levelSubject).innerJoin(subject, eq(levelSubject.subjectId, subject.id)).where(where),
  ]);
  const teachers = rows.length
    ? await db
        .select({ levelSubjectId: levelSubjectTeachers.gradelevelsubjectId, name: employee.name })
        .from(levelSubjectTeachers)
        .innerJoin(employee, eq(levelSubjectTeachers.employeeId, employee.id))
        .where(inArray(levelSubjectTeachers.gradelevelsubjectId, rows.map((r) => r.id)))
        .orderBy(asc(employee.name))
    : [];
  return (
    <ListPage
      title="Matérias por série"
      newHref={`/grades/level-subjects/new${level ? `?grade_level=${level}` : ""}`}
      newLabel="Nova matéria na série"
      searchPlaceholder="Pesquisar por matéria ou professor..."
      filters={<FilterSelect name="grade_level" label="Série" options={GRADE_LEVELS} />}
      headers={["Série", "Matéria", "Professores", "Aulas por semana"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[
            label(GRADE_LEVELS.map(([v, l]) => [String(v), l] as const), String(r.gradeLevel)),
            r.subject,
            teachers.filter((t) => t.levelSubjectId === r.id).map((t) => t.name).join(", ") || "—",
            <span key="w" className="block text-right">{r.weeklyClasses ? formatMoney(r.weeklyClasses).replace(/,00$/, "") : "—"}</span>,
          ]}
          label={`${r.subject} na ${r.gradeLevel}ª série`}
          editHref={`/grades/level-subjects/${r.id}/edit`}
          deleteAction={deleteLevelSubject.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
