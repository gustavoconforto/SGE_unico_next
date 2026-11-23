import { requirePermission } from "@/lib/authorization";
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { incidentsIncidenttype as incidentType } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteIncidentType } from "./actions";

export const metadata: Metadata = { title: "Tipos de ocorrência" };

export default async function IncidentTypeListPage({ searchParams }: PageProps<"/incidents/types">) {
  await requirePermission("academicSetup", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [incidentType.type]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(incidentType)
      .where(where)
      .orderBy(asc(incidentType.type))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(incidentType).where(where),
  ]);
  return (
    <ListPage
      title="Tipos de ocorrência"
      newHref="/incidents/types/new"
      newLabel="Novo tipo de ocorrência"
      searchPlaceholder="Pesquisar tipo..."
      headers={["Tipo", "Penalidade"]}
      page={page}
      total={total}
    >
      {rows.map((t) => (
        <ListRow
          key={t.id}
          cells={[
            t.type,
            <span key="p" className="block text-right">
              {t.penalty.replace(".", ",")}
            </span>,
          ]}
          label={t.type}
          editHref={`/incidents/types/${t.id}/edit`}
          deleteAction={deleteIncidentType.bind(null, t.id)}
        />
      ))}
    </ListPage>
  );
}
