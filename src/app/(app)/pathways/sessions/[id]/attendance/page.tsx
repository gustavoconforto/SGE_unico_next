import { requirePermission } from "@/lib/authorization";
import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { classesClass as klass, enrollmentsEnrollment as enrollment, pathwaysPathwayattendance as attendance, pathwaysPathwayenrollment as member, pathwaysPathwaysession as session, studentsStudent as student } from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { idParam } from "@/lib/list";
import { classCell } from "../../../../incidents/records";
import { getOffering, membersBetween } from "../../../data";
import { AttendanceForm } from "./attendance-form";

export const metadata: Metadata = { title: "Chamada" };

export default async function AttendancePage({ params }: PageProps<"/pathways/sessions/[id]/attendance">) {
  await requirePermission("pathways", "edit");
  const id = await idParam(params);
  const [s] = await db.select().from(session).where(eq(session.id, id));
  if (!s) notFound();
  const [o, members, saved] = await Promise.all([
    getOffering(s.offeringId),
    db
      .select({ id: member.id, student: student.name, className: klass.name, gradeLevel: klass.gradeLevel })
      .from(member)
      .innerJoin(enrollment, eq(member.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .where(membersBetween(s.offeringId, s.date, s.date))
      .orderBy(asc(student.name)),
    db.select().from(attendance).where(eq(attendance.sessionId, id)),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Chamada — {o?.label}</h1>
      <p className="text-sm text-gray-600">
        Aula de {formatDate(s.date)}
        {s.topic && ` · ${s.topic}`}. Todos começam como presentes.
      </p>
      <AttendanceForm sessionId={id} cancelHref={`/pathways/sessions?offering=${s.offeringId}`} rows={members.map((m) => ({ id: m.id, student: m.student, className: classCell(m), status: saved.find((a) => a.pathwayEnrollmentId === m.id)?.status ?? "P" }))} />
    </div>
  );
}
