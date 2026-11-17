import { and, asc, count, desc, eq, exists, ilike, inArray, or } from "drizzle-orm";
import { TableCell, TableRow } from "flowbite-react";
import { CellLabel } from "@/components/list-labels";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteButton } from "@/components/delete-button";
import { FilterSelect } from "@/components/list-controls";
import { ListPage, PRIMARY_CELL } from "@/components/list-page";
import { LinkButton } from "@/components/link-button";
import { db } from "@/db";
import {
  employeesEmployee as employee,
  enrollmentsSchoolyear as year,
  pathwaysPathway as pathway,
  pathwaysPathwayoffering as offering,
  pathwaysPathwayofferingTeachers as offeringTeachers,
} from "@/db/schema/app";
import { PAGE_SIZE, likePattern, pageParam, param } from "@/lib/list";
import { ref } from "@/lib/sql";
import { yearOptions } from "../../classes/options";
import { offeringYear, seatsTaken } from "../data";
import { deleteOffering } from "./actions";

export const metadata: Metadata = { title: "Turmas de itinerário" };

const link = "text-sm text-blue-600 hover:underline dark:text-blue-400";

export default async function OfferingListPage({ searchParams }: PageProps<"/pathways/offerings">) {
  const sp = await searchParams;
  const q = param(sp, "q");
  const p = likePattern(q);
  const yearId = Number(param(sp, "school_year")) || null;
  const pathwayId = Number(param(sp, "pathway")) || null;
  const where = and(
    yearId ? eq(offering.schoolYearId, yearId) : undefined,
    pathwayId ? eq(offering.pathwayId, pathwayId) : undefined,
    q
      ? or(
          ilike(pathway.name, p),
          ilike(offering.name, p),
          ilike(offering.schedule, p),
          exists(db.select().from(offeringTeachers).innerJoin(employee, eq(offeringTeachers.employeeId, employee.id)).where(and(eq(offeringTeachers.pathwayofferingId, ref(offering.id)), ilike(employee.name, p)))),
        )
      : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }], years, pathways] = await Promise.all([
    db
      .select({ id: offering.id, name: offering.name, schedule: offering.schedule, capacity: offering.capacity, pathway: pathway.name, year: offeringYear, taken: seatsTaken })
      .from(offering)
      .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
      .innerJoin(year, eq(offering.schoolYearId, year.id))
      .where(where)
      .orderBy(desc(year.begins), asc(pathway.name), asc(offering.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(offering).innerJoin(pathway, eq(offering.pathwayId, pathway.id)).where(where),
    yearOptions(),
    db.select({ id: pathway.id, name: pathway.name }).from(pathway).orderBy(asc(pathway.name)),
  ]);
  const teachers = rows.length
    ? await db
        .select({ offeringId: offeringTeachers.pathwayofferingId, name: employee.name })
        .from(offeringTeachers)
        .innerJoin(employee, eq(offeringTeachers.employeeId, employee.id))
        .where(inArray(offeringTeachers.pathwayofferingId, rows.map((r) => r.id)))
        .orderBy(asc(employee.name))
    : [];
  return (
    <ListPage
      title="Turmas de itinerário"
      newHref="/pathways/offerings/new"
      newLabel="Nova turma de itinerário"
      searchPlaceholder="Pesquisar por itinerário, turma, horário ou professor..."
      filters={
        <>
          <FilterSelect name="school_year" label="Ano escolar" options={years} allLabel="Todos" />
          <FilterSelect name="pathway" label="Itinerário" options={pathways.map((x) => [x.id, x.name] as const)} allLabel="Todos" />
        </>
      }
      headers={["Itinerário", "Ano escolar", "Turma", "Horário", "Professores", "Inscritos"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <TableRow key={r.id}>
          <TableCell className={PRIMARY_CELL}>{r.pathway}</TableCell>
          <TableCell>
            <CellLabel i={1} />
            {r.year}
          </TableCell>
          <TableCell>
            <CellLabel i={2} />
            {r.name || "—"}
          </TableCell>
          <TableCell>
            <CellLabel i={3} />
            {r.schedule || "—"}
          </TableCell>
          <TableCell>
            <CellLabel i={4} />
            {teachers.filter((t) => t.offeringId === r.id).map((t) => t.name).join(", ") || "—"}</TableCell>
          <TableCell className="text-right">
            <CellLabel i={5} />
            {r.taken}
            {r.capacity !== null && ` / ${r.capacity}`}
          </TableCell>
          <TableCell className="max-sm:basis-full">
            <div className="flex flex-wrap items-center gap-2">
              <Link className={link} href={`/pathways/enrollments?offering=${r.id}`}>Inscritos</Link>
              <Link className={link} href={`/pathways/sessions?offering=${r.id}`}>Aulas</Link>
              <Link className={link} href={`/pathways/grades?school_year=${yearId ?? ""}&offering=${r.id}`}>Notas</Link>
              <a className={link} href={`/pathways/offerings/${r.id}/diary`} target="_blank" rel="noopener">Diário</a>
              <LinkButton href={`/pathways/offerings/${r.id}/edit`} size="xs" color="alternative" aria-label={`Editar ${r.pathway}`}>
                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
              </LinkButton>
              <DeleteButton action={deleteOffering.bind(null, r.id)} label={`${r.pathway} ${r.year}`} />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </ListPage>
  );
}
