// What a portal user may see: a guardian their linked students (students_guardianassociation), a student themself.
import "server-only";

import { type AnyColumn, and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  portalAlert as alert,
  studentsGuardianassociation as link,
  studentsStudent as student,
} from "@/db/schema/app";
import { PORTAL_LOGIN } from "@/lib/portal-paths";
import { getCurrentSession } from "@/lib/session";
import { displayName } from "@/lib/students";
import { classShortLabel } from "../(app)/enrollments/data";

/** Who is signed in to the portal; guardian-only features check `kind`. */
export type PortalViewer = { kind: "guardian"; guardianId: number } | { kind: "student"; studentId: number };

/** Every portal page and action calls this first: the signed-in guardian or student, or → the portal login. */
export async function requirePortalUser(): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>;
  viewer: PortalViewer;
}> {
  const session = await getCurrentSession();
  if (session?.user.guardianId != null)
    return { session, viewer: { kind: "guardian", guardianId: session.user.guardianId } };
  if (session?.user.studentId != null)
    return { session, viewer: { kind: "student", studentId: session.user.studentId } };
  redirect(PORTAL_LOGIN);
}

/** `column` (a student id) is one the viewer may see. */
const visible = (column: AnyColumn, viewer: PortalViewer) =>
  viewer.kind === "student"
    ? eq(column, viewer.studentId)
    : inArray(column, db.select({ id: link.studentId }).from(link).where(eq(link.guardianId, viewer.guardianId)));

/** The viewer's students with their active enrollments' classes and their school years (none when not placed yet). */
export async function portalStudents(viewer: PortalViewer) {
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
    .from(student)
    .leftJoin(enrollment, and(eq(enrollment.studentId, student.id), eq(enrollment.status, "A")))
    .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
    .where(visible(student.id, viewer))
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
        label: classShortLabel({ gradeLevel: r.gradeLevel, name: r.className! }),
      });
    students.set(r.id, s);
  }
  return [...students.values()];
}

/** The latest notices for everyone or for one of `classIds` (the viewer's students' classes). */
export async function portalAlerts(classIds: number[], limit = 20) {
  const forClass = classIds.length ? inArray(alert.schoolClassId, classIds) : undefined;
  return db
    .select({ id: alert.id, title: alert.title, body: alert.body, createdAt: alert.createdAt })
    .from(alert)
    .where(or(isNull(alert.schoolClassId), forClass))
    .orderBy(desc(alert.createdAt), desc(alert.id))
    .limit(limit);
}

/**
 * The start (YYYY-MM-DD) of the enrollment's school year, or null when the viewer may not see the enrollment:
 * the check before showing its grades.
 */
export async function viewerEnrollmentYearStart(viewer: PortalViewer, enrollmentId: number) {
  const [row] = await db
    .select({ begins: year.begins })
    .from(enrollment)
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .where(and(eq(enrollment.id, enrollmentId), visible(enrollment.studentId, viewer)))
    .limit(1);
  return row?.begins ?? null;
}
