import { requirePermission } from "@/lib/authorization";
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { documentsDocumenttype as documentType } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteDocumentType } from "./actions";

export const metadata: Metadata = { title: "Tipos de documento" };

export default async function DocumentTypeListPage({ searchParams }: PageProps<"/documents/types">) {
  await requirePermission("documents", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [documentType.type]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(documentType)
      .where(where)
      .orderBy(asc(documentType.type))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(documentType).where(where),
  ]);
  return (
    <ListPage
      title="Tipos de documento"
      newHref="/documents/types/new"
      newLabel="Novo tipo de documento"
      searchPlaceholder="Pesquisar tipo..."
      headers={["Tipo"]}
      page={page}
      total={total}
    >
      {rows.map((t) => (
        <ListRow
          key={t.id}
          cells={[t.type]}
          label={t.type}
          editHref={`/documents/types/${t.id}/edit`}
          deleteAction={deleteDocumentType.bind(null, t.id)}
        />
      ))}
    </ListPage>
  );
}
