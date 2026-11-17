import { and, asc, countDistinct, eq, inArray } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { ListPagination, SearchBox } from "@/components/list-controls";
import { db } from "@/db";
import {
  classesClass as klass,
  employeesEmployee as employee,
  enrollmentsEnrollment as enrollment,
  gradesGradelevelsubject as levelSubject,
  gradesGradelevelsubjectTeachers as levelSubjectTeachers,
  gradesSubject as subject,
  studentsStudent as student,
} from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { yearOptions } from "../options";
import { ClassPicker } from "./class-picker";

export const metadata: Metadata = { title: "Alunos da turma" };

const ACTIVE = "A"; // EnrollmentStatus.ACTIVE

const intParam = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);
const classLabel = (c: { gradeLevel: number | null; name: string }) => `${c.gradeLevel ? `${c.gradeLevel}º ` : ""}${c.name}`;

export default async function ClassDetailPage({ searchParams }: PageProps<"/classes/detail">) {
  const sp = await searchParams;
  const yearId = intParam(param(sp, "school_year"));
  const classId = intParam(param(sp, "school_class"));
  const page = pageParam(sp);

  const [years, classes, [selected]] = await Promise.all([
    yearOptions(),
    yearId ? db.select().from(klass).where(eq(klass.yearId, yearId)).orderBy(asc(klass.gradeLevel), asc(klass.name)) : [],
    classId ? db.select().from(klass).where(eq(klass.id, classId)) : [],
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Alunos da turma</h1>
      <ClassPicker years={years} classes={classes.map((c) => [c.id, classLabel(c)])} yearId={yearId} classId={selected?.id ?? null} />
      {selected ? <ClassContents classId={selected.id} gradeLevel={selected.gradeLevel} q={param(sp, "q")} page={page} /> : <p className="text-gray-500">Selecione o ano letivo e a turma.</p>}
    </div>
  );
}

async function ClassContents({ classId, gradeLevel, q, page }: { classId: number; gradeLevel: number | null; q: string; page: number }) {
  const where = and(eq(enrollment.schoolClassId, classId), eq(enrollment.status, ACTIVE), searchWhere(q, [student.name]));
  const [students, [{ total }], subjects] = await Promise.all([
    db
      .selectDistinct({ id: student.id, name: student.name })
      .from(student)
      .innerJoin(enrollment, eq(enrollment.studentId, student.id))
      .where(where)
      .orderBy(asc(student.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: countDistinct(student.id) }).from(student).innerJoin(enrollment, eq(enrollment.studentId, student.id)).where(where),
    gradeLevel
      ? db
          .select({ id: levelSubject.id, subject: subject.name, weeklyClasses: levelSubject.weeklyClasses })
          .from(levelSubject)
          .innerJoin(subject, eq(levelSubject.subjectId, subject.id))
          .where(eq(levelSubject.gradeLevel, gradeLevel))
          .orderBy(asc(subject.name))
      : [],
  ]);
  const teachers = subjects.length
    ? await db
        .select({ levelSubjectId: levelSubjectTeachers.gradelevelsubjectId, name: employee.name })
        .from(levelSubjectTeachers)
        .innerJoin(employee, eq(levelSubjectTeachers.employeeId, employee.id))
        .where(inArray(levelSubjectTeachers.gradelevelsubjectId, subjects.map((s) => s.id)))
        .orderBy(asc(employee.name))
    : [];

  return (
    <>
      {gradeLevel && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Matérias da {gradeLevel}ª série</h2>
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Matéria</TableHeadCell>
                  <TableHeadCell>Professores</TableHeadCell>
                  <TableHeadCell className="text-right">Aulas por semana</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell>{teachers.filter((t) => t.levelSubjectId === s.id).map((t) => t.name).join(", ") || "—"}</TableCell>
                    <TableCell className="text-right">{s.weeklyClasses ? Number(s.weeklyClasses).toLocaleString("pt-BR") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Alunos ({total})</h2>
        <SearchBox placeholder="Pesquisar aluno..." />
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeadCell>Nome</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-gray-500">Nenhum aluno encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListPagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
      </section>
    </>
  );
}
