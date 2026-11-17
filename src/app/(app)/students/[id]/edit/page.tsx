import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { db } from "@/db";
import { studentsGuardianassociation as link, studentsStudent as student } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { studentPhotoUrl } from "@/lib/media";
import { guardianOptions } from "../../options";
import { StudentForm } from "../../student-form";

export const metadata: Metadata = { title: "Editar aluno" };

export default async function EditStudentPage({ params }: PageProps<"/students/[id]/edit">) {
  const id = await idParam(params);
  const [[row], links, options] = await Promise.all([
    db.select().from(student).where(eq(student.id, id)),
    db.select().from(link).where(eq(link.studentId, id)).orderBy(asc(link.id)),
    guardianOptions(),
  ]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Editar aluno — {row.name}</h1>
        <LinkButton href={`/enrollments/new?student=${id}`} color="alternative">
          Matricular
        </LinkButton>
      </div>
      <StudentForm
        id={id}
        defaults={row}
        photoUrl={await studentPhotoUrl(row.photo, row.registration)}
        guardianRows={links.map(({ studentId: _s, ...l }) => ({ ...l, delete: false }))}
        guardianOptions={options}
      />
    </div>
  );
}
