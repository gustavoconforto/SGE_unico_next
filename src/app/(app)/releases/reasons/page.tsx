import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { releasesExitreason as reason } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteReason } from "./actions";

export const metadata: Metadata = { title: "Motivos de liberação" };

export default async function ReasonListPage({ searchParams }: PageProps<"/releases/reasons">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [reason.reason]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(reason)
      .where(where)
      .orderBy(asc(reason.reason))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(reason).where(where),
  ]);
  return (
    <ListPage title="Motivos de liberação" newHref="/releases/reasons/new" newLabel="Novo motivo" searchPlaceholder="Pesquisar motivo..." headers={["Motivo"]} page={page} total={total}>
      {rows.map((r) => (
        <ListRow key={r.id} cells={[r.reason]} label={r.reason} editHref={`/releases/reasons/${r.id}/edit`} deleteAction={deleteReason.bind(null, r.id)} />
      ))}
    </ListPage>
  );
}
