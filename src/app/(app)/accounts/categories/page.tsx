import { and, asc, count, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterSelect } from "@/components/list-controls";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { accountsAccounttype as accountType } from "@/db/schema/app";
import { DIRECTIONS, label } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { ref } from "@/lib/sql";
import { deleteCategory } from "./actions";

export const metadata: Metadata = { title: "Categorias financeiras" };

export default async function CategoryListPage({ searchParams }: PageProps<"/accounts/categories">) {
  const sp = await searchParams;
  const direction = param(sp, "direction");
  const where = and(searchWhere(param(sp, "q"), [accountType.name]), ["R", "P"].includes(direction) ? eq(accountType.direction, direction) : undefined);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: accountType.id,
        name: accountType.name,
        direction: accountType.direction,
        accounts: sql<number>`(select count(*) from accounts_account a where a.category_id = ${ref(accountType.id)})::int`,
      })
      .from(accountType)
      .where(where)
      .orderBy(asc(accountType.direction), asc(accountType.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(accountType).where(where),
  ]);
  return (
    <ListPage
      title="Categorias financeiras"
      newHref="/accounts/categories/new"
      newLabel="Nova categoria"
      searchPlaceholder="Pesquisar categoria..."
      filters={<FilterSelect name="direction" label="Natureza" options={DIRECTIONS} />}
      headers={["Nome", "Natureza", "Contas"]}
      page={page}
      total={total}
    >
      {rows.map((c) => (
        <ListRow key={c.id} cells={[c.name, label(DIRECTIONS, c.direction), c.accounts]} label={c.name} editHref={`/accounts/categories/${c.id}/edit`} deleteAction={deleteCategory.bind(null, c.id)} />
      ))}
    </ListPage>
  );
}
