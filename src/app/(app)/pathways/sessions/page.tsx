import { requirePermission } from "@/lib/authorization";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { TableCell, TableRow } from "flowbite-react";
import { CellLabel } from "@/components/list-labels";
import type { Metadata } from "next";
import { DeleteButton } from "@/components/delete-button";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { LinkButton } from "@/components/link-button";
import { ACTIONS_CELL, ListPage, PRIMARY_CELL } from "@/components/list-page";
import { db } from "@/db";
import {
  enrollmentsSchoolyear as year,
  pathwaysPathway as pathway,
  pathwaysPathwayoffering as offering,
  pathwaysPathwaysession as session,
} from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { ref } from "@/lib/sql";
import { offeringLabel, offeringOptions, offeringYear } from "../data";
import { deleteSession } from "./actions";

export const metadata: Metadata = { title: "Aulas e chamadas" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const counted = (status: string) =>
  sql<number>`(select count(*) from pathways_pathwayattendance a where a.session_id = ${ref(session.id)} and a.status = ${status})::int`;

export default async function SessionListPage({ searchParams }: PageProps<"/pathways/sessions">) {
  await requirePermission("pathways", "view");
  const sp = await searchParams;
  const offeringId = Number(param(sp, "offering")) || null;
  const where = and(
    searchWhere(param(sp, "q"), [pathway.name, offering.name, session.topic]),
    offeringId ? eq(session.offeringId, offeringId) : undefined,
    DATE_RE.test(param(sp, "date_from")) ? gte(session.date, param(sp, "date_from")) : undefined,
    DATE_RE.test(param(sp, "date_to")) ? lte(session.date, param(sp, "date_to")) : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }], offerings] = await Promise.all([
    db
      .select({
        id: session.id,
        date: session.date,
        topic: session.topic,
        pathway: pathway.name,
        offeringName: offering.name,
        year: offeringYear,
        present: counted("P"),
        absent: counted("F"),
        excused: counted("J"),
      })
      .from(session)
      .innerJoin(offering, eq(session.offeringId, offering.id))
      .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
      .innerJoin(year, eq(offering.schoolYearId, year.id))
      .where(where)
      .orderBy(desc(session.date), asc(pathway.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(session)
      .innerJoin(offering, eq(session.offeringId, offering.id))
      .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
      .where(where),
    offeringOptions(),
  ]);
  return (
    <ListPage
      title="Aulas e chamadas"
      newHref={`/pathways/sessions/new${offeringId ? `?offering=${offeringId}` : ""}`}
      newLabel="Nova aula"
      searchPlaceholder="Pesquisar por itinerário, turma ou conteúdo..."
      filters={
        <>
          <FilterSelect
            name="offering"
            label="Turma de itinerário"
            options={offerings.map((o) => [o.id, o.label] as const)}
          />
          <FilterDate name="date_from" label="De" />
          <FilterDate name="date_to" label="Até" />
        </>
      }
      headers={["Data", "Turma de itinerário", "Conteúdo", "Presentes", "Faltas"]}
      numeric={["Presentes", "Faltas"]}
      page={page}
      total={total}
    >
      {rows.map((r) => {
        const taken = r.present + r.absent + r.excused > 0;
        return (
          <TableRow key={r.id}>
            <TableCell>
              <CellLabel i={0} />
              {formatDate(r.date)}
            </TableCell>
            <TableCell className={PRIMARY_CELL}>
              {offeringLabel({ pathway: r.pathway, year: r.year, name: r.offeringName })}
            </TableCell>
            <TableCell>
              <CellLabel i={2} />
              {r.topic || "—"}
            </TableCell>
            {taken ? (
              <>
                <TableCell className="text-right">
                  <CellLabel i={3} />
                  {r.present}
                </TableCell>
                <TableCell className="text-right">
                  <CellLabel i={4} />
                  {r.absent + r.excused}
                </TableCell>
              </>
            ) : (
              <TableCell colSpan={2} className="text-right text-gray-500">
                Sem chamada
              </TableCell>
            )}
            <TableCell className={ACTIONS_CELL}>
              <div className="flex gap-2 whitespace-nowrap">
                <LinkButton
                  href={`/pathways/sessions/${r.id}/attendance`}
                  size="xs"
                  color="alternative"
                  className="px-2"
                  aria-label={`Chamada da aula de ${formatDate(r.date)}`}
                  data-tip="Chamada"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    checklist
                  </span>
                </LinkButton>
                <LinkButton
                  href={`/pathways/sessions/${r.id}/edit`}
                  size="xs"
                  color="alternative"
                  className="px-2"
                  aria-label={`Editar a aula de ${formatDate(r.date)}`}
                  data-tip="Editar"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    edit
                  </span>
                </LinkButton>
                <DeleteButton
                  action={deleteSession.bind(null, r.id)}
                  label={`a aula de ${formatDate(r.date)}`}
                  note="A chamada desta aula também é excluída."
                />
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </ListPage>
  );
}
