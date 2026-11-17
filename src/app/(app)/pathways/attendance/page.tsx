import { and, asc, eq, gte, inArray, lte, or, isNull, sql } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import {
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  pathwaysPathway as pathway,
  pathwaysPathwayattendance as attendance,
  pathwaysPathwayenrollment as member,
  pathwaysPathwayoffering as offering,
  pathwaysPathwaysession as session,
} from "@/db/schema/app";
import { bimesterRange } from "@/lib/concept-db";
import { formatDate } from "@/lib/finance";
import { param } from "@/lib/list";
import { formatHours } from "@/lib/pathways";
import { attendanceCounts, enrollmentWorkload } from "@/lib/pathways-db";
import Decimal from "decimal.js";
import { activeEnrollmentOptions } from "../../enrollments/data";
import { offeringLabel } from "../data";
import { BIMESTER_OPTIONS, UrlPicker } from "../picker";

export const metadata: Metadata = { title: "Frequência do aluno" };

export default async function StudentAttendancePage({ searchParams }: PageProps<"/pathways/attendance">) {
  const sp = await searchParams;
  const enrollments = await activeEnrollmentOptions();
  const enrollmentId = enrollments.find(([id]) => id === Number(param(sp, "enrollment")))?.[0] ?? null;
  const bimester = [1, 2, 3, 4].find((b) => b === Number(param(sp, "bimester"))) ?? null;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Frequência do aluno</h1>
        <p className="text-sm text-gray-500">Selecione o aluno e o bimestre.</p>
      </div>
      <Suspense>
        <UrlPicker
          fields={[
            { name: "enrollment", label: "Aluno", empty: "Selecione um aluno", options: enrollments },
            { name: "bimester", label: "Bimestre", empty: "Selecione um bimestre", options: BIMESTER_OPTIONS },
          ]}
        />
      </Suspense>
      {enrollmentId && bimester ? <Report enrollmentId={enrollmentId} bimester={bimester} /> : <p className="text-gray-500">Selecione um aluno e um bimestre para ver a frequência.</p>}
    </div>
  );
}

async function Report({ enrollmentId, bimester }: { enrollmentId: number; bimester: number }) {
  const [e] = await db.select({ y: year }).from(enrollment).innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id)).innerJoin(year, eq(enrollmentType.schoolYearId, year.id)).where(eq(enrollment.id, enrollmentId));
  const range = bimesterRange(e.y, bimester);
  const total = ((await enrollmentWorkload(enrollmentId)) ?? []).reduce((s, m) => s.plus(m.workload), new Decimal(0));
  const footer = (
    <p className="text-sm">
      Carga horária no ano letivo: <strong>{formatHours(total)} h</strong>
    </p>
  );
  if (!range)
    return (
      <>
        <p className="text-gray-500">
          O ano letivo deste aluno não tem as datas deste bimestre. <Link className="text-blue-600 hover:underline" href={`/enrollments/school-years/${e.y.id}/edit`}>Cadastre as datas do bimestre</Link>.
        </p>
        {footer}
      </>
    );
  const [begins, ends] = range;
  const rows = await db
    .select({ id: member.id, pathway: pathway.name, name: offering.name, year: sql<number>`(select extract(year from y.begins)::int from enrollments_schoolyear y where y.id = ${offering.schoolYearId})`, ...attendanceCounts(begins, ends) })
    .from(member)
    .innerJoin(offering, eq(member.offeringId, offering.id))
    .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
    .where(and(eq(member.enrollmentId, enrollmentId), lte(member.joinedAt, ends), or(isNull(member.leftAt), gte(member.leftAt, begins))))
    .orderBy(asc(pathway.name), asc(offering.name));
  const missed = rows.length
    ? await db
        .select({ id: attendance.pathwayEnrollmentId, status: attendance.status, date: session.date })
        .from(attendance)
        .innerJoin(session, eq(attendance.sessionId, session.id))
        .where(and(inArray(attendance.pathwayEnrollmentId, rows.map((r) => r.id)), inArray(attendance.status, ["F", "J"]), gte(session.date, begins), lte(session.date, ends)))
        .orderBy(asc(session.date))
    : [];
  const days = (id: number, status: string) => missed.filter((m) => m.id === id && m.status === status).map((m) => formatDate(m.date)).join(", ") || "-";
  return (
    <>
      <p className="text-sm text-gray-500">
        Aulas de {formatDate(begins)} a {formatDate(ends)}.
      </p>
      <Table striped>
        <TableHead>
          <TableRow>
            <TableHeadCell>Itinerário</TableHeadCell>
            <TableHeadCell className="text-right">Presenças</TableHeadCell>
            <TableHeadCell className="text-right">Faltas</TableHeadCell>
            <TableHeadCell className="text-right">Justificadas</TableHeadCell>
            <TableHeadCell>Dias de falta</TableHeadCell>
            <TableHeadCell>Dias de falta justificada</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-gray-900 dark:text-white">{offeringLabel(r)}</TableCell>
                <TableCell className="text-right">{r.present}</TableCell>
                <TableCell className="text-right">{r.absent}</TableCell>
                <TableCell className="text-right">{r.excused}</TableCell>
                <TableCell>{days(r.id, "F")}</TableCell>
                <TableCell>{days(r.id, "J")}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500">
                Nenhum registro encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {footer}
    </>
  );
}
