import { and, asc, countDistinct, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  studentsStudent as student,
} from "@/db/schema/app";
import { currentSchoolYear } from "@/lib/concept-db";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { yearOptions } from "../options";
import { studentName } from "../../enrollments/data";
import { ClassPicker } from "./class-picker";

export const metadata: Metadata = { title: "Alunos da turma" };

const ACTIVE = "A"; // EnrollmentStatus.ACTIVE

const intParam = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);
const classLabel = (c: { gradeLevel: number | null; name: string }) =>
  `${c.gradeLevel ? `${c.gradeLevel}º ` : ""}${c.name}`;

export default async function ClassDetailPage({
  searchParams,
}: PageProps<"/classes/detail">) {
  const sp = await searchParams;
  const urlYearId = intParam(param(sp, "school_year"));
  const classId = intParam(param(sp, "school_class"));
  const q = param(sp, "q");
  const page = pageParam(sp);

  const [[selected], current] = await Promise.all([
    classId ? db.select().from(klass).where(eq(klass.id, classId)) : [],
    urlYearId ? null : currentSchoolYear(),
  ]);
  // The class's own year wins, so the picker never disagrees with the roster; no year at all: the current one
  const yearId = selected?.yearId ?? urlYearId ?? current?.id ?? null;
  const where = selected
    ? and(eq(enrollment.schoolClassId, selected.id), eq(enrollment.status, ACTIVE), searchWhere(q, [student.name, student.socialName]))
    : undefined;

  const [years, classes, students, [{ total }]] = await Promise.all([
    yearOptions(),
    yearId
      ? db
          .select()
          .from(klass)
          .where(eq(klass.yearId, yearId))
          .orderBy(asc(klass.gradeLevel), asc(klass.name))
      : [],
    where
      ? db
          .selectDistinct({ id: student.id, name: studentName })
          .from(student)
          .innerJoin(enrollment, eq(enrollment.studentId, student.id))
          .where(where)
          .orderBy(asc(studentName))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE)
      : [],
    where
      ? db
          .select({ total: countDistinct(student.id) })
          .from(student)
          .innerJoin(enrollment, eq(enrollment.studentId, student.id))
          .where(where)
      : [{ total: 0 }],
  ]);

  const empty = !selected
    ? yearId
      ? "Selecione a turma."
      : "Selecione o ano letivo e a turma."
    : q
      ? `Nenhum aluno corresponde a “${q}”.`
      : "Nenhum aluno ativo nesta turma.";

  return (
    <ListPage
      title="Alunos da turma"
      searchPlaceholder="Pesquisar aluno..."
      filters={
        <ClassPicker
          years={years}
          classes={classes.map((c) => [c.id, classLabel(c)])}
          yearId={yearId}
          classId={selected?.id ?? null}
        />
      }
      headers={["Nome"]}
      empty={empty}
      page={page}
      total={total}
    >
      {students.map((s) => (
        <ListRow key={s.id} cells={[s.name]} label={s.name} href={`/students/${s.id}`} />
      ))}
    </ListPage>
  );
}
