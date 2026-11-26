import { requirePermission } from "@/lib/authorization";
import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { db } from "@/db";
import {
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  programsProgram as program,
  studentsGuardianassociation as link,
  studentsStudent as student,
} from "@/db/schema/app";
import { EnrollmentStatusBadge } from "@/components/enrollment-status-badge";
import { idParam } from "@/lib/list";
import { ownerLogin } from "@/lib/login";
import { studentPhotoUrl } from "@/lib/media";
import { enrollmentTypeLabel, yearOf } from "../../../enrollments/data";
import { displayName } from "@/lib/students";
import { guardianOptions } from "../../options";
import { StudentForm } from "../../student-form";

export const metadata: Metadata = { title: "Editar aluno" };

export default async function EditStudentPage({ params }: PageProps<"/students/[id]/edit">) {
  await requirePermission("students", "edit");
  const id = await idParam(params);
  const [[row], links, options, enrollments, login] = await Promise.all([
    db.select().from(student).where(eq(student.id, id)),
    db.select().from(link).where(eq(link.studentId, id)).orderBy(asc(link.id)),
    guardianOptions(),
    db
      .select({
        id: enrollment.id,
        status: enrollment.status,
        program: program.name,
        level: enrollmentType.level,
        schoolYear: yearOf,
      })
      .from(enrollment)
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .innerJoin(program, eq(enrollmentType.programId, program.id))
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .where(eq(enrollment.studentId, id))
      .orderBy(desc(enrollment.enrolledAt)),
    ownerLogin({ studentId: id }),
  ]);
  if (!row) notFound();
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Editar aluno — {displayName(row)}</h1>
        <LinkButton href={`/enrollments/new?student=${id}`} color="alternative">
          Matricular
        </LinkButton>
      </div>
      {/* Who this is at a glance: the registration and every enrollment, each a link (not a select that navigates on change) */}
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <dt className="text-sm text-gray-600">Matrícula</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{row.registration}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Matrículas em cursos</dt>
          <dd className="mt-0.5">
            {enrollments.length ? (
              <ul className="flex flex-col gap-1">
                {enrollments.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/enrollments/${e.id}/edit`}
                      className="font-medium text-gray-900 underline underline-offset-2 hover:text-primary-700"
                    >
                      {enrollmentTypeLabel(e.program, e.level, e.schoolYear)}
                    </Link>
                    <EnrollmentStatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-gray-600">Nenhuma ainda. Use “Matricular”.</span>
            )}
          </dd>
        </div>
      </dl>
      <StudentForm
        id={id}
        defaults={login ? { ...row, access: true } : row}
        photoUrl={await studentPhotoUrl(row.photo, row.registration)}
        guardianRows={links.map(({ studentId: _s, ...l }) => ({ ...l, delete: false }))}
        guardianOptions={options}
      />
    </div>
  );
}
