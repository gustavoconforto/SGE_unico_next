import { requirePermission } from "@/lib/authorization";
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { accountsSupplier as supplier } from "@/db/schema/app";
import { formatDocument, personKind } from "@/lib/format";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { formatPhone } from "@/lib/person";
import { deleteSupplier } from "./actions";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function SupplierListPage({ searchParams }: PageProps<"/accounts/suppliers">) {
  await requirePermission("finance", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [
    supplier.name,
    supplier.document,
    supplier.phone,
    supplier.email,
    supplier.notes,
  ]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(supplier)
      .where(where)
      .orderBy(asc(supplier.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(supplier).where(where),
  ]);
  return (
    <ListPage
      title="Fornecedores"
      newHref="/accounts/suppliers/new"
      newLabel="Novo fornecedor"
      searchPlaceholder="Pesquisar por nome, CPF/CNPJ, telefone ou e-mail..."
      headers={["Nome", "CPF/CNPJ", "Contato"]}
      page={page}
      total={total}
    >
      {rows.map((s) => (
        <ListRow
          key={s.id}
          cells={[
            s.name,
            s.document ? (
              <span>
                {formatDocument(s.document)} <span className="text-xs text-gray-500">{personKind(s.document)}</span>
              </span>
            ) : (
              "—"
            ),
            [formatPhone(s.phone), s.email].filter(Boolean).join(" · ") || "—",
          ]}
          label={s.name}
          editHref={`/accounts/suppliers/${s.id}/edit`}
          deleteAction={deleteSupplier.bind(null, s.id)}
        />
      ))}
    </ListPage>
  );
}
