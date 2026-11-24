// Queries shared by the timetable and the class diary (lessons/forms.py helpers, lessons/services.py).
import { and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  classesClass as klass,
  departmentsDepartmentTeachers as departmentTeachers,
  employeesEmployee as employee,
  enrollmentsSchoolyear as year,
  gradesGradelevelsubject as levelSubject,
  gradesGradelevelsubjectTeachers as levelSubjectTeachers,
  gradesSubject as subject,
  lessonsTimetableslot as slot,
} from "@/db/schema/app";
import { yearOf } from "../enrollments/data";

/** Classes with a series: only they have subjects, so only they have lessons. */
export async function seriesClasses() {
  const rows = await db
    .select({
      id: klass.id,
      name: klass.name,
      gradeLevel: klass.gradeLevel,
      shift: klass.shift,
      yearId: klass.yearId,
      year: yearOf,
      begins: year.begins,
      ends: year.ends,
    })
    .from(klass)
    .innerJoin(year, eq(klass.yearId, year.id))
    .where(ne(klass.gradeLevel, 0))
    .orderBy(desc(year.begins), asc(klass.gradeLevel), asc(klass.name));
  return rows
    .filter((c) => c.gradeLevel)
    .map((c) => ({ ...c, gradeLevel: c.gradeLevel!, label: `${c.gradeLevel}º ${c.name} - ${c.year}` }));
}
export type SeriesClass = Awaited<ReturnType<typeof seriesClasses>>[number];

export async function seriesClass(id: number) {
  return (await seriesClasses()).find((c) => c.id === id) ?? null;
}

/** The series' subjects (GradeLevelSubject rows) with their teachers. */
export async function levelSubjects(gradeLevel: number) {
  const subjects = await db
    .select({
      id: levelSubject.id,
      subjectId: subject.id,
      name: subject.name,
      departmentId: subject.departmentId,
      weeklyClasses: levelSubject.weeklyClasses,
    })
    .from(levelSubject)
    .innerJoin(subject, eq(levelSubject.subjectId, subject.id))
    .where(eq(levelSubject.gradeLevel, gradeLevel))
    .orderBy(asc(subject.name));
  const teachers = subjects.length
    ? await db
        .select({ levelSubjectId: levelSubjectTeachers.gradelevelsubjectId, id: employee.id, name: employee.name })
        .from(levelSubjectTeachers)
        .innerJoin(employee, eq(levelSubjectTeachers.employeeId, employee.id))
        .where(
          inArray(
            levelSubjectTeachers.gradelevelsubjectId,
            subjects.map((s) => s.id),
          ),
        )
        .orderBy(asc(employee.name))
    : [];
  return subjects.map((s) => ({
    ...s,
    teachers: teachers.filter((t) => t.levelSubjectId === s.id).map(({ id, name }) => ({ id, name })),
  }));
}
export type LevelSubject = Awaited<ReturnType<typeof levelSubjects>>[number];

/** Who may give a lecture of the subject: its teachers in the series or, as substitutes, its department's teachers. */
export async function lectureTeacherIds(s: LevelSubject) {
  const department = s.departmentId
    ? await db
        .select({ id: departmentTeachers.employeeId })
        .from(departmentTeachers)
        .where(eq(departmentTeachers.departmentId, s.departmentId))
    : [];
  return new Set([...s.teachers.map((t) => t.id), ...department.map((t) => t.id)]);
}

/** The teachers of the series' subjects and of their departments (the diary's teacher options). */
export async function levelTeachers(subjects: LevelSubject[]) {
  const departmentIds = [...new Set(subjects.map((s) => s.departmentId).filter((d): d is number => d !== null))];
  const ids = new Set(subjects.flatMap((s) => s.teachers.map((t) => t.id)));
  const rows = await db
    .selectDistinct({ id: employee.id, name: employee.name })
    .from(employee)
    .leftJoin(departmentTeachers, eq(departmentTeachers.employeeId, employee.id))
    .where(
      or(
        ids.size ? inArray(employee.id, [...ids]) : undefined,
        departmentIds.length ? inArray(departmentTeachers.departmentId, departmentIds) : undefined,
      ),
    )
    .orderBy(asc(employee.name));
  return ids.size || departmentIds.length ? rows : [];
}

export async function classSlots(classId: number) {
  return db.select().from(slot).where(eq(slot.schoolClassId, classId));
}

/** A teacher booked in another class of the same year and shift, at the same weekday and period. */
export async function teacherClash(c: SeriesClass, teacherId: number, weekday: number, period: number) {
  const [clash] = await db
    .select({ name: klass.name, gradeLevel: klass.gradeLevel, year: yearOf })
    .from(slot)
    .innerJoin(klass, eq(slot.schoolClassId, klass.id))
    .innerJoin(year, eq(klass.yearId, year.id))
    .where(
      and(
        eq(slot.teacherId, teacherId),
        eq(slot.weekday, weekday),
        eq(slot.period, period),
        eq(klass.yearId, c.yearId),
        eq(klass.shift, c.shift),
        ne(klass.id, c.id),
      ),
    )
    .limit(1);
  return clash
    ? `O professor já tem aula na turma ${clash.gradeLevel ? `${clash.gradeLevel}º ` : ""}${clash.name} - ${clash.year} neste horário.`
    : null;
}
