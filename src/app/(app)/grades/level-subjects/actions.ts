"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  departmentsDepartmentTeachers as departmentTeachers,
  gradesGradelevelsubject as levelSubject,
  gradesGradelevelsubjectTeachers as levelSubjectTeachers,
  gradesSubject as subject,
} from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { INVALID_CHOICE, REQUIRED, type FormState, decimalField, foreignKey, formIds, parseForm } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const levelSubjectSchema = z.object({
  gradeLevel: z.coerce.number({ error: REQUIRED }).int().min(1, REQUIRED).max(3, REQUIRED),
  subjectId: foreignKey,
  weeklyClasses: decimalField({ maxDigits: 4, min: 0, optional: true }),
});

export async function saveLevelSubject(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("academicSetup", "edit");
  const teacherIds = formIds(formData, "teachers");
  const { data, values, state } = parseForm(levelSubjectSchema, formData);
  values.teachers = teacherIds.join(",");
  if (!data) return { ...state, values };

  const [taken] = await db
    .select({ id: levelSubject.id })
    .from(levelSubject)
    .where(and(eq(levelSubject.gradeLevel, data.gradeLevel), eq(levelSubject.subjectId, data.subjectId), id ? ne(levelSubject.id, id) : undefined));
  if (taken) return { errors: { subjectId: ["Esta matéria já está cadastrada nesta série."] }, values };
  // Only the teachers of the subject's department can be picked
  const [s] = await db.select({ departmentId: subject.departmentId }).from(subject).where(eq(subject.id, data.subjectId));
  const allowed = s?.departmentId
    ? new Set((await db.select({ id: departmentTeachers.employeeId }).from(departmentTeachers).where(eq(departmentTeachers.departmentId, s.departmentId))).map((t) => t.id))
    : new Set<number>();
  if (teacherIds.some((t) => !allowed.has(t))) return { errors: { teachers: [INVALID_CHOICE] }, values };

  await db.transaction(async (tx) => {
    let levelSubjectId = id;
    if (levelSubjectId === null) [{ id: levelSubjectId }] = await tx.insert(levelSubject).values(data).returning({ id: levelSubject.id });
    else await tx.update(levelSubject).set(data).where(eq(levelSubject.id, levelSubjectId));
    await tx.delete(levelSubjectTeachers).where(eq(levelSubjectTeachers.gradelevelsubjectId, levelSubjectId));
    if (teacherIds.length) await tx.insert(levelSubjectTeachers).values(teacherIds.map((employeeId) => ({ gradelevelsubjectId: levelSubjectId!, employeeId })));
  });
  redirect(`/grades/level-subjects?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteLevelSubject(id: number) {
  await requirePermission("academicSetup", "edit");
  // The teacher links go with it (Django clears M2M rows); grades keep the subject, not this row
  await deleteAndRedirect(
    () =>
      db.transaction(async (tx) => {
        await tx.delete(levelSubjectTeachers).where(eq(levelSubjectTeachers.gradelevelsubjectId, id));
        await tx.delete(levelSubject).where(eq(levelSubject.id, id));
      }),
    "/grades/level-subjects",
  );
}
