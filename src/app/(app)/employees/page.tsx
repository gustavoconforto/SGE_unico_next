import { asc, count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { employeesEmployee as employee, employeesEmployeeroletype as role } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteEmployee } from "./actions";

export const metadata: Metadata = { title: "Funcionários" };

export default async function EmployeeListPage({ searchParams }: PageProps<"/employees">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [employee.name, employee.cpf, role.role]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: employee.id, name: employee.name, role: role.role })
      .from(employee)
      .innerJoin(role, eq(employee.roleId, role.id))
      .where(where)
      .orderBy(asc(employee.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(employee).innerJoin(role, eq(employee.roleId, role.id)).where(where),
  ]);

  return (
    <ListPage title="Funcionários" newHref="/employees/new" newLabel="Novo funcionário" searchPlaceholder="Pesquisar por nome, CPF ou cargo..." headers={["Nome", "Cargo"]} page={page} total={total}>
      {rows.map((e) => (
        <ListRow key={e.id} cells={[e.name, e.role]} label={e.name} editHref={`/employees/${e.id}/edit`} deleteAction={deleteEmployee.bind(null, e.id)} />
      ))}
    </ListPage>
  );
}
