import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment, enrollmentsEnrollmenttype as enrollmentType, pathwaysPathwayenrollment as member } from "@/db/schema/app";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "../../../enrollments/data";
import { offeringOptions } from "../../data";
import { StudentPathwaysForm, StudentPicker } from "./pathways-form";

export const metadata: Metadata = { title: "Inscrever aluno" };

export default async function StudentPathwaysPage({ searchParams }: PageProps<"/pathways/enrollments/by-student">) {
  await requirePermission("pathways", "edit");
  const enrollments = await activeEnrollmentOptions();
  const id = Number(param(await searchParams, "enrollment")) || null;
  const active = id && enrollments.some(([x]) => x === id) ? id : null;
  let rows = null;
  if (active) {
    const [e] = await db.select({ schoolYearId: enrollmentType.schoolYearId }).from(enrollment).innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id)).where(eq(enrollment.id, active));
    const [offerings, memberships] = await Promise.all([offeringOptions({ schoolYearId: e.schoolYearId }), db.select().from(member).where(eq(member.enrollmentId, active))]);
    rows = offerings
      .sort((a, b) => a.pathway.localeCompare(b.pathway) || a.name.localeCompare(b.name))
      .map((o) => {
        const m = memberships.find((x) => x.offeringId === o.id);
        return { id: o.id, pathway: o.pathway, name: o.name, schedule: o.schedule, capacity: o.capacity, taken: o.taken, current: !!m && m.leftAt === null, full: o.capacity !== null && o.taken >= o.capacity };
      });
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Inscrever aluno</h1>
      <p className="text-sm text-gray-500">Marque os itinerários do aluno no ano escolar. Desmarcar registra a saída (o histórico de presença e notas é mantido).</p>
      <StudentPicker enrollments={enrollments} value={active} />
      {rows && <StudentPathwaysForm key={active} enrollmentId={active!} rows={rows} />}
    </div>
  );
}
