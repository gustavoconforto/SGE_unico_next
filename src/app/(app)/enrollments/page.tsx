import { and, count, desc, asc, eq } from "drizzle-orm";
import { EnrollmentStatusBadge } from "@/components/enrollment-status-badge";
import type { Metadata } from "next";
import { FilterSelect } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  programsProgram as program,
  studentsStudent as student,
} from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { yearOptions } from "../classes/options";
import { enrollmentTypeLabel, studentName, yearOf } from "./data";

export const metadata: Metadata = { title: "Matrículas" };

export default async function EnrollmentListPage({ searchParams }: PageProps<"/enrollments">) {
  const sp = await searchParams;
  const yearId = Number(param(sp, "school_year")) || null;
  const where = and(searchWhere(param(sp, "q"), [student.name, student.socialName, student.registration, klass.name, program.name]), yearId ? eq(enrollmentType.schoolYearId, yearId) : undefined);
  const page = pageParam(sp);
  const base = () =>
    db
      .select({
        id: enrollment.id,
        status: enrollment.status,
        student: studentName,
        registration: student.registration,
        program: program.name,
        level: enrollmentType.level,
        schoolYear: yearOf,
        className: klass.name,
        gradeLevel: klass.gradeLevel,
      })
      .from(enrollment)
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .innerJoin(program, eq(enrollmentType.programId, program.id))
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id));
  const [rows, [{ total }], years] = await Promise.all([
    base()
      .where(where)
      .orderBy(desc(enrollment.enrolledAt), asc(student.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(enrollment)
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .innerJoin(program, eq(enrollmentType.programId, program.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .where(where),
    yearOptions(),
  ]);

  return (
    <ListPage
      title="Matrículas"
      newHref="/enrollments/new"
      newLabel="Nova matrícula"
      searchPlaceholder="Pesquisar por aluno, matrícula, turma ou curso..."
      filters={<FilterSelect name="school_year" label="Ano letivo" options={years} allLabel="Todos" />}
      headers={["Aluno", "Matrícula", "Tipo", "Turma", "Situação"]}
      page={page}
      total={total}
    >
      {rows.map((e) => (
        <ListRow
          key={e.id}
          cells={[
            e.student,
            e.registration,
            enrollmentTypeLabel(e.program, e.level, e.schoolYear),
            e.className ? `${e.gradeLevel ? `${e.gradeLevel}º ` : ""}${e.className}` : "—",
            <EnrollmentStatusBadge key="s" status={e.status} />,
          ]}
          label={e.student}
          editHref={`/enrollments/${e.id}/edit`}
        />
      ))}
    </ListPage>
  );
}
