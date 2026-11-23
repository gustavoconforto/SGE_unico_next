import { requirePermission } from "@/lib/authorization";
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { enrollmentsDiscounttype as discountType } from "@/db/schema/app";
import { formatMoney } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteDiscountType } from "./actions";

export const metadata: Metadata = { title: "Descontos" };

export default async function DiscountTypeListPage({ searchParams }: PageProps<"/enrollments/discounts">) {
  await requirePermission("enrollmentSetup", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [discountType.description]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(discountType)
      .where(where)
      .orderBy(asc(discountType.description))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(discountType).where(where),
  ]);
  return (
    <ListPage
      title="Descontos"
      newHref="/enrollments/discounts/new"
      newLabel="Novo desconto"
      searchPlaceholder="Pesquisar desconto..."
      headers={["Descrição", "Porcentagem"]}
      page={page}
      total={total}
    >
      {rows.map((d) => (
        <ListRow
          key={d.id}
          cells={[d.description, `${formatMoney(d.percentage)}%`]}
          label={d.description}
          editHref={`/enrollments/discounts/${d.id}/edit`}
          deleteAction={deleteDiscountType.bind(null, d.id)}
        />
      ))}
    </ListPage>
  );
}
