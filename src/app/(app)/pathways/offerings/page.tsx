import { and, asc, count, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
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

const link = "text-sm text-primary-600 hover:underline dark:text-primary-400";

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
      .select({ id: offering.id, yearId: offering.schoolYearId, givesGrade: sql<boolean>`${pathway.extraPoints} > 0`, name: offering.name, schedule: offering.schedule, capacity: offering.capacity, pathway: pathway.name, year: offeringYear, taken: seatsTaken })
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
      numeric={["Inscritos"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          label={`${r.pathway} ${r.year}`}
          editHref={`/pathways/offerings/${r.id}/edit`}
          deleteAction={deleteOffering.bind(null, r.id)}
          cells={[
            r.pathway,
            r.year,
            r.name || "—",
            r.schedule || "—",
            teachers.filter((t) => t.offeringId === r.id).map((t) => t.name).join(", ") || "—",
            <Link key="taken" className={`${link} block text-right whitespace-nowrap tabular-nums`} href={`/pathways/enrollments?offering=${r.id}`} aria-label={`Inscritos em ${r.pathway}: ${r.taken}${r.capacity !== null ? ` de ${r.capacity}` : ""}`}>
              {r.taken}
              {r.capacity !== null && ` / ${r.capacity}`}
            </Link>,
          ]}
          actions={
            <>
              <LinkButton href={`/pathways/sessions?offering=${r.id}`} size="xs" color="alternative" className="px-2" aria-label={`Aulas de ${r.pathway}`} data-tip="Aulas e chamadas">
                <span className="material-symbols-outlined" aria-hidden="true">fact_check</span>
              </LinkButton>
              {/* The grades page only lists pathways that give extra points */}
              {r.givesGrade && (
                <LinkButton href={`/pathways/grades?school_year=${r.yearId}&offering=${r.id}`} size="xs" color="alternative" className="px-2" aria-label={`Notas de ${r.pathway}`} data-tip="Notas">
                  <span className="material-symbols-outlined" aria-hidden="true">grading</span>
                </LinkButton>
              )}
              <LinkButton href={`/pathways/offerings/${r.id}/diary`} target="_blank" rel="noopener" size="xs" color="alternative" className="px-2" aria-label={`Diário de ${r.pathway} (nova aba)`} data-tip="Diário">
                <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
              </LinkButton>
            </>
          }
        />
      ))}
    </ListPage>
  );
}
