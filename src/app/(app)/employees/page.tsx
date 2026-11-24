import { asc, count, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { employeesEmployee as employee, employeesEmployeeroletype as role } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { type AssignableRole, ROLE_LABELS, roleList } from "@/lib/permissions";
import { deleteEmployee, setUserRoles } from "./actions";
import { requireAdmin } from "@/lib/authorization";

export const metadata: Metadata = { title: "Funcionários" };

export default async function EmployeeListPage({ searchParams }: PageProps<"/employees">) {
  const sp = await searchParams;
  await requireAdmin();
  const where = searchWhere(param(sp, "q"), [employee.name, employee.cpf, role.role, user.name, user.username]);
  const page = pageParam(sp);
  const name = sql<string>`coalesce(${employee.name}, ${user.name})`;
  // Full join: employees without a login and logins without an employee (create-admin) both show up
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: employee.id,
        name,
        role: role.role,
        userId: user.id,
        username: user.username,
        roles: user.role,
      })
      .from(employee)
      .leftJoin(role, eq(employee.roleId, role.id))
      .fullJoin(user, eq(user.employeeId, employee.id))
      .where(where)
      .orderBy(asc(name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(employee)
      .leftJoin(role, eq(employee.roleId, role.id))
      .fullJoin(user, eq(user.employeeId, employee.id))
      .where(where),
  ]);

  return (
    <ListPage
      title="Funcionários"
      newHref="/employees/new"
      newLabel="Novo funcionário"
      searchPlaceholder="Pesquisar por nome, CPF, cargo ou usuário..."
      headers={["Nome", "Cargo", "Usuário", "Perfis"]}
      page={page}
      total={total}
    >
      {rows.map((e) => (
        <ListRow
          key={e.id ?? e.userId}
          cells={[
            e.name,
            e.role ?? "—",
            e.username ?? "—",
            e.userId ? <RolePicker userId={e.userId} current={roleList(e.roles)} /> : "Sem acesso",
          ]}
          label={e.name}
          editHref={e.id ? `/employees/${e.id}/edit` : undefined}
          deleteAction={e.id ? deleteEmployee.bind(null, e.id) : undefined}
        />
      ))}
    </ListPage>
  );
}

/** A no-JS multiselect: the summary lists the login's roles; opening it shows a checkbox per role and Salvar. */
function RolePicker({ userId, current }: { userId: string; current: string[] }) {
  const picked = current.filter((r): r is AssignableRole => Object.hasOwn(ROLE_LABELS, r));
  return (
    <form action={setUserRoles.bind(null, userId)}>
      <details>
        <summary className="cursor-pointer text-sm">
          {picked.length ? picked.map((r) => ROLE_LABELS[r]).join(", ") : "Nenhum perfil"}
        </summary>
        <div className="mt-2 flex flex-col gap-1.5">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="role"
                value={value}
                defaultChecked={current.includes(value)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              {label}
            </label>
          ))}
          <button
            type="submit"
            className="mt-1 self-start rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800 focus:ring-4 focus:ring-primary-300"
          >
            Salvar
          </button>
        </div>
      </details>
    </form>
  );
}
