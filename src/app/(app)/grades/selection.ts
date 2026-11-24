// Year → class → subject options from the query string (grades/views.py grade_selection).
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  classesClass as klass,
  gradesGradelevelsubject as levelSubject,
  gradesSubject as subject,
} from "@/db/schema/app";
import { GRADE_PERIODS } from "@/lib/grades";
import { param } from "@/lib/list";
import { yearOptions } from "../classes/options";

const int = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);

export async function gradeSelection(sp: Record<string, string | string[] | undefined>) {
  const year = int(param(sp, "school_year"));
  const [years, classes] = await Promise.all([
    yearOptions(),
    year ? db.select().from(klass).where(eq(klass.yearId, year)).orderBy(asc(klass.gradeLevel), asc(klass.name)) : [],
  ]);
  // A choice that doesn't belong to the one before it is dropped
  const c = classes.find((x) => x.id === int(param(sp, "school_class")));
  const subjects = c?.gradeLevel
    ? await db
        .select({ id: subject.id, name: subject.name })
        .from(levelSubject)
        .innerJoin(subject, eq(levelSubject.subjectId, subject.id))
        .where(and(eq(levelSubject.gradeLevel, c.gradeLevel)))
        .orderBy(asc(subject.name))
    : [];
  const subjectId = subjects.find((s) => s.id === int(param(sp, "subject")))?.id ?? null;
  const period = GRADE_PERIODS.find(([p]) => p === int(param(sp, "bimester")))?.[0] ?? null;
  return {
    years,
    classes: classes.map((x) => [x.id, `${x.gradeLevel ? `${x.gradeLevel}º ` : ""}${x.name}`] as [number, string]),
    subjects: subjects.map((s) => [s.id, s.name] as [number, string]),
    selected: { year, klass: c?.id ?? null, subject: subjectId, period },
  };
}
