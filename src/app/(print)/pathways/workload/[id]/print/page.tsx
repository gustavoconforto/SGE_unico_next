import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { classesClass as klass, enrollmentsEnrollment as enrollment, enrollmentsEnrollmenttype as enrollmentType, enrollmentsSchoolyear as year, studentsStudent as student } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { enrollmentWorkload } from "@/lib/pathways-db";
import { classCell } from "../../../../../(app)/incidents/records";
import { WorkloadTable } from "../../../../../(app)/pathways/workload/table";
import { Letterhead, box, page } from "../../../../letterhead";
import { PrintToolbar } from "../../../../print-toolbar";

export const metadata: Metadata = { title: "Carga horária" };

export default async function WorkloadPrintPage({ params }: PageProps<"/pathways/workload/[id]/print">) {
  const id = await idParam(params);
  const [[e], rows] = await Promise.all([
    db
      .select({ name: student.name, registration: student.registration, className: klass.name, gradeLevel: klass.gradeLevel, begins: year.begins })
      .from(enrollment)
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .where(eq(enrollment.id, id)),
    enrollmentWorkload(id),
  ]);
  if (!e || !rows) notFound();
  return (
    <>
      <PrintToolbar />
      <main className={page}>
        <style>{"@page { size: A4; margin: 10mm; }"}</style>
        <Letterhead />
        <h1 className="mb-2 text-center text-[14pt] font-bold uppercase">Relatório de carga horária – Itinerários</h1>
        <table className="mb-3 w-full border-collapse text-left">
          <tbody>
            <tr>
              <th className={box}>ALUNO(A):</th>
              <td className={box} colSpan={3}>{e.name}</td>
            </tr>
            <tr>
              <th className={box}>MATRÍCULA:</th>
              <td className={box}>{e.registration || "-"}</td>
              <th className={box}>TURMA:</th>
              <td className={box}>{classCell(e).replace("—", "-")}</td>
            </tr>
            <tr>
              <th className={box}>ANO ESCOLAR:</th>
              <td className={box} colSpan={3}>{e.begins.slice(0, 4)}</td>
            </tr>
          </tbody>
        </table>
        <WorkloadTable rows={rows} className="w-full border-collapse" cell={box} />
      </main>
    </>
  );
}
