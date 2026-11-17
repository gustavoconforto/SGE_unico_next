import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { employeesEmployee as employee, enrollmentsEnrollment as enrollment, pathwaysPathwayenrollment as member, pathwaysPathwayofferingTeachers as offeringTeachers, studentsStudent as student } from "@/db/schema/app";
import { bimesterRange } from "@/lib/concept-db";
import { formatDate, today } from "@/lib/finance";
import { idParam, param } from "@/lib/list";
import { isMemberOn, lessonDays } from "@/lib/pathways";
import { getOffering, membersBetween } from "../../../../../(app)/pathways/data";
import { Letterhead, box, page } from "../../../../letterhead";
import { PrintToolbar } from "../../../../print-toolbar";
import { BimesterSelect } from "./bimester-select";

export const metadata: Metadata = { title: "Diário de itinerário" };

const WEEKDAY = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function DiaryPage({ params, searchParams }: PageProps<"/pathways/offerings/[id]/diary">) {
  const id = await idParam(params);
  const o = await getOffering(id);
  if (!o) notFound();
  await connection();
  // ?bimester=N, else the bimester containing today, else the 1st
  const now = today();
  const requested = Number(param(await searchParams, "bimester"));
  const bimester = [1, 2, 3, 4].find((b) => b === requested) ?? [1, 2, 3, 4].find((b) => { const r = bimesterRange(o.y, b); return r && r[0] <= now && now <= r[1]; }) ?? 1;
  const range = bimesterRange(o.y, bimester);
  const weekdays = (o.o.weekdays as number[] | null) ?? [];
  const days = range && weekdays.length ? lessonDays(weekdays, ...range) : [];
  const [teachers, members] = await Promise.all([
    db.select({ name: employee.name }).from(offeringTeachers).innerJoin(employee, eq(offeringTeachers.employeeId, employee.id)).where(eq(offeringTeachers.pathwayofferingId, id)).orderBy(asc(employee.name)),
    days.length
      ? db.select({ id: member.id, student: student.name, joinedAt: member.joinedAt, leftAt: member.leftAt }).from(member).innerJoin(enrollment, eq(member.enrollmentId, enrollment.id)).innerJoin(student, eq(enrollment.studentId, student.id)).where(membersBetween(id, ...range!)).orderBy(asc(student.name))
      : Promise.resolve([]),
  ]);
  const message = !range ? (
    "O ano escolar não tem as datas deste bimestre. Preencha-as no cadastro do ano escolar."
  ) : !weekdays.length ? (
    <>
      Defina os dias de aula da turma para montar o diário. <Link className="text-blue-600 underline" href={`/pathways/offerings/${id}/edit`}>Editar turma de itinerário</Link>
    </>
  ) : !days.length ? (
    "Nenhum dia de aula neste bimestre."
  ) : !members.length ? (
    "Nenhum aluno inscrito nesta turma de itinerário no bimestre."
  ) : null;
  return (
    <>
      <PrintToolbar>
        <BimesterSelect value={bimester} />
      </PrintToolbar>
      <main className={page.replace("max-w-[210mm]", "max-w-[297mm]")}>
        <style>{"@page { size: A4 landscape; margin: 10mm; }"}</style>
        <Letterhead />
        <h1 className="mb-2 text-center text-[14pt] font-bold uppercase">Diário de classe – Itinerário</h1>
        <table className="mb-3 w-full border-collapse text-left">
          <tbody>
            <tr>
              <th className={box}>ITINERÁRIO:</th>
              <td className={box}>{o.p.name}{o.o.name && ` – ${o.o.name}`}</td>
              <th className={box}>ANO ESCOLAR:</th>
              <td className={box}>{o.year}</td>
            </tr>
            <tr>
              <th className={box}>PROFESSOR(A):</th>
              <td className={box}>{teachers.map((t) => t.name).join(", ") || "-"}</td>
              <th className={box}>BIMESTRE:</th>
              <td className={box}>
                {bimester}º bimestre {range && `(${formatDate(range[0])} a ${formatDate(range[1])})`}
              </td>
            </tr>
            <tr>
              <th className={box}>HORÁRIO:</th>
              <td className={box} colSpan={3}>{o.o.schedule || "-"}</td>
            </tr>
          </tbody>
        </table>
        {message ? (
          <p className="my-6 text-center">{message}</p>
        ) : (
          <>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${box} w-6`}>Nº</th>
                  <th className={`${box} text-left`}>Aluno</th>
                  {days.map((d) => (
                    <th key={d} className={`${box} text-[7pt]`}>
                      {d.slice(8, 10)}/{d.slice(5, 7)}
                      <small className="block font-normal">{WEEKDAY[new Date(`${d}T00:00:00Z`).getUTCDay()]}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id}>
                    <td className={`${box} text-center`}>{i + 1}</td>
                    <td className={`${box} whitespace-nowrap`}>{m.student}</td>
                    {days.map((d) => (isMemberOn(m, d) ? <td key={d} className={box} /> : <td key={d} className={`${box} bg-gray-100 text-center`}>—</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[8pt]">Marque P (presente), F (falta) ou J (falta justificada). “—”: o aluno não estava inscrito no dia.</p>
          </>
        )}
        <section className="mt-16 grid grid-cols-2 gap-16 text-center">
          <div className="border-t border-gray-900 pt-1">Professor(a)</div>
          <div className="border-t border-gray-900 pt-1">Coordenação</div>
        </section>
      </main>
    </>
  );
}
