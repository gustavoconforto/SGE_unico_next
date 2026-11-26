// What a signed-in guardian may see: only their own students, found through students_guardianassociation.
import "server-only";

import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  portalAlert as alert,
  studentsGuardianassociation as link,
  studentsStudent as student,
} from "@/db/schema/app";
import { PORTAL_LOGIN } from "@/lib/portal-paths";
import { getCurrentSession } from "@/lib/session";
import { displayName } from "@/lib/students";

/** Every portal page and action calls this first: the signed-in guardian's id, or → the portal login. */
export async function requireGuardian() {
  const session = await getCurrentSession();
  const guardianId = session?.user.guardianId;
  if (guardianId == null) redirect(PORTAL_LOGIN);
  return { session: session!, guardianId };
}

/** The guardian's students with their active enrollments' classes and their school years (none when not placed yet). */
export async function guardianStudents(guardianId: number) {
  const rows = await db
    .select({
      id: student.id,
      name: student.name,
      socialName: student.socialName,
      useSocialName: student.useSocialName,
      classId: klass.id,
      className: klass.name,
      gradeLevel: klass.gradeLevel,
      yearId: klass.yearId,
      enrollmentId: enrollment.id,
    })
    .from(link)
    .innerJoin(student, eq(link.studentId, student.id))
    .leftJoin(enrollment, and(eq(enrollment.studentId, student.id), eq(enrollment.status, "A")))
    .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
    .where(eq(link.guardianId, guardianId))
    .orderBy(asc(student.name), asc(klass.id));
  type Class = { id: number; yearId: number; enrollmentId: number; label: string };
  const students = new Map<number, { id: number; name: string; classes: Class[] }>();
  for (const r of rows) {
    const s = students.get(r.id) ?? { id: r.id, name: displayName(r), classes: [] };
    if (r.classId !== null)
      s.classes.push({
        id: r.classId,
        yearId: r.yearId!,
        enrollmentId: r.enrollmentId!,
        label: `${r.gradeLevel ? `${r.gradeLevel}º ` : ""}${r.className}`,
      });
    students.set(r.id, s);
  }
  return [...students.values()];
}

/** The latest notices for every guardian or for one of `classIds` (the guardian's students' classes). */
export async function guardianAlerts(classIds: number[], limit = 20) {
  const forClass = classIds.length ? inArray(alert.schoolClassId, classIds) : undefined;
  return db
    .select({ id: alert.id, title: alert.title, body: alert.body, createdAt: alert.createdAt })
    .from(alert)
    .where(or(isNull(alert.schoolClassId), forClass))
    .orderBy(desc(alert.createdAt), desc(alert.id))
    .limit(limit);
}

/** Whether the enrollment is of one of the guardian's students: the check before showing its grades. */
export async function isGuardianEnrollment(guardianId: number, enrollmentId: number) {
  const [row] = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .innerJoin(link, eq(link.studentId, enrollment.studentId))
    .where(and(eq(enrollment.id, enrollmentId), eq(link.guardianId, guardianId)))
    .limit(1);
  return row !== undefined;
}
