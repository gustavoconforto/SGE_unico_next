import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { enrollmentsNeededdocumenttype as documentType } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteDocumentType } from "./actions";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentTypeListPage({ searchParams }: PageProps<"/enrollments/documents">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [documentType.description]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(documentType)
      .where(where)
      .orderBy(asc(documentType.description))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(documentType).where(where),
  ]);
  return (
    <ListPage title="Documentos" newHref="/enrollments/documents/new" newLabel="Novo documento" searchPlaceholder="Pesquisar documento..." headers={["Descrição"]} page={page} total={total}>
      {rows.map((d) => (
        <ListRow key={d.id} cells={[d.description]} label={d.description} editHref={`/enrollments/documents/${d.id}/edit`} deleteAction={deleteDocumentType.bind(null, d.id)} />
      ))}
    </ListPage>
  );
}
