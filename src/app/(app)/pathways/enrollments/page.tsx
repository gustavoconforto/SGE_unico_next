import { requirePermission } from "@/lib/authorization";
import { and, asc, count, eq, isNotNull, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterSelect } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  enrollmentsSchoolyear as year,
  pathwaysPathway as pathway,
  pathwaysPathwayenrollment as member,
  pathwaysPathwayoffering as offering,
  studentsStudent as student,
} from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { classCell, studentColumns } from "../../incidents/records";
import { offeringLabel, offeringOptions, offeringYear } from "../data";
import { deleteMember } from "./actions";

export const metadata: Metadata = { title: "Inscrições em itinerários" };

export default async function MemberListPage({ searchParams }: PageProps<"/pathways/enrollments">) {
  await requirePermission("pathways", "view");
  const sp = await searchParams;
  const offeringId = Number(param(sp, "offering")) || null;
  const status = param(sp, "status");
  const where = and(
    searchWhere(param(sp, "q"), [student.name, student.socialName, pathway.name]),
    offeringId ? eq(member.offeringId, offeringId) : undefined,
    status === "current" ? isNull(member.leftAt) : status === "left" ? isNotNull(member.leftAt) : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }], offerings] = await Promise.all([
    db
      .select({
        id: member.id,
        joinedAt: member.joinedAt,
        leftAt: member.leftAt,
        pathway: pathway.name,
        offeringName: offering.name,
        year: offeringYear,
        ...studentColumns,
      })
      .from(member)
      .innerJoin(enrollment, eq(member.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .innerJoin(offering, eq(member.offeringId, offering.id))
      .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
      .innerJoin(year, eq(offering.schoolYearId, year.id))
      .where(where)
      .orderBy(asc(pathway.name), asc(student.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(member)
      .innerJoin(enrollment, eq(member.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .innerJoin(offering, eq(member.offeringId, offering.id))
      .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
      .where(where),
    offeringOptions(),
  ]);
  return (
    <ListPage
      title="Inscrições em itinerários"
      newHref={`/pathways/enrollments/new${offeringId ? `?offering=${offeringId}` : ""}`}
      newLabel="Nova inscrição"
      searchPlaceholder="Pesquisar por aluno ou itinerário..."
      filters={
        <>
          <FilterSelect
            name="offering"
            label="Turma de itinerário"
            options={offerings.map((o) => [o.id, o.label] as const)}
          />
          <FilterSelect
            name="status"
            label="Situação"
            options={[
              ["current", "Inscritos"],
              ["left", "Saíram"],
            ]}
          />
        </>
      }
      headers={["Aluno", "Turma", "Itinerário", "Entrada", "Saída"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[
            r.student,
            classCell(r),
            offeringLabel({ pathway: r.pathway, year: r.year, name: r.offeringName }),
            formatDate(r.joinedAt),
            formatDate(r.leftAt) || "—",
          ]}
          label={`a inscrição de ${r.student}`}
          editHref={`/pathways/enrollments/${r.id}/edit`}
          deleteAction={deleteMember.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
