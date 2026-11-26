// What a signed-in guardian may see: only their own students, found through students_guardianassociation.
import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
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

/** The guardian's students with their active enrollments' classes (none when not enrolled or not placed yet). */
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
    })
    .from(link)
    .innerJoin(student, eq(link.studentId, student.id))
    .leftJoin(enrollment, and(eq(enrollment.studentId, student.id), eq(enrollment.status, "A")))
    .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
    .where(eq(link.guardianId, guardianId))
    .orderBy(asc(student.name), asc(klass.id));
  const students = new Map<number, { id: number; name: string; classes: { id: number; label: string }[] }>();
  for (const r of rows) {
    const s = students.get(r.id) ?? { id: r.id, name: displayName(r), classes: [] };
    if (r.classId !== null)
      s.classes.push({ id: r.classId, label: `${r.gradeLevel ? `${r.gradeLevel}º ` : ""}${r.className}` });
    students.set(r.id, s);
  }
  return [...students.values()];
}
