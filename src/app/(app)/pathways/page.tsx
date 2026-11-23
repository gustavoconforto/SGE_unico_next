import { requirePermission } from "@/lib/authorization";
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { pathwaysPathway as pathway } from "@/db/schema/app";
import { label } from "@/lib/finance";
import { formatGrade } from "@/lib/grades";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { WORKLOAD_TYPES, formatHours } from "@/lib/pathways";
import { deletePathway } from "./actions";

export const metadata: Metadata = { title: "Itinerários" };

export default async function PathwayListPage({ searchParams }: PageProps<"/pathways">) {
  await requirePermission("pathways", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [pathway.name, pathway.description]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(pathway).where(where).orderBy(asc(pathway.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(pathway).where(where),
  ]);
  return (
    <ListPage title="Itinerários" newHref="/pathways/new" newLabel="Novo itinerário" searchPlaceholder="Pesquisar por nome ou descrição..." headers={["Nome", "Descrição", "Nota máxima", "Carga horária"]} page={page} total={total}>
      {rows.map((p) => (
        <ListRow
          key={p.id}
          cells={[
            p.name,
            <span key="d" className="line-clamp-2">{p.description || "—"}</span>,
            <span key="n" className="block text-right">{Number(p.extraPoints) > 0 ? formatGrade(p.extraPoints) : "Sem nota"}</span>,
            p.workloadType === "F" ? `${formatHours(p.workloadHours)} h` : label(WORKLOAD_TYPES, p.workloadType),
          ]}
          label={p.name}
          editHref={`/pathways/${p.id}/edit`}
          deleteAction={deletePathway.bind(null, p.id)}
        />
      ))}
    </ListPage>
  );
}
