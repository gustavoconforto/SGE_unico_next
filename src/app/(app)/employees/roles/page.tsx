import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { employeesEmployeeroletype as role } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteRole } from "./actions";
import { requireAdmin } from "@/lib/authorization";

export const metadata: Metadata = { title: "Cargos" };

export default async function RoleListPage({
  searchParams,
}: PageProps<"/employees/roles">) {
  await requireAdmin();
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [role.role]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(role)
      .where(where)
      .orderBy(asc(role.role))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(role).where(where),
  ]);

  return (
    <ListPage
      title="Cargos"
      newHref="/employees/roles/new"
      newLabel="Novo cargo"
      searchPlaceholder="Pesquisar cargo..."
      headers={["Cargo"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[r.role]}
          label={r.role}
          editHref={`/employees/roles/${r.id}/edit`}
          deleteAction={deleteRole.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
