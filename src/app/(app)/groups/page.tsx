import { asc, count, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { accessGroup as group, accessGroupPermissions as groupPermission, accessGroupRoles as groupRole, employeesEmployeeroletype as role } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteGroup } from "./actions";

export const metadata: Metadata = { title: "Grupos e permissões" };

export default async function GroupListPage({ searchParams }: PageProps<"/groups">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [group.name]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(group).where(where).orderBy(asc(group.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(group).where(where),
  ]);
  const ids = rows.map((g) => g.id);
  const [roles, permissionCounts] = ids.length
    ? await Promise.all([
        db.select({ groupId: groupRole.groupId, name: role.role }).from(groupRole).innerJoin(role, eq(groupRole.roleId, role.id)).where(inArray(groupRole.groupId, ids)).orderBy(asc(role.role)),
        db.select({ groupId: groupPermission.groupId, n: count() }).from(groupPermission).where(inArray(groupPermission.groupId, ids)).groupBy(groupPermission.groupId),
      ])
    : [[], []];
  const rolesOf = (id: number) => roles.filter((r) => r.groupId === id).map((r) => r.name).join(", ") || "—";
  const permissionsOf = (id: number) => String(permissionCounts.find((p) => p.groupId === id)?.n ?? 0);

  return (
    <ListPage title="Grupos e permissões" newHref="/groups/new" newLabel="Novo grupo" searchPlaceholder="Pesquisar grupo..." headers={["Grupo", "Cargos", "Permissões"]} page={page} total={total}>
      {rows.map((g) => (
        <ListRow key={g.id} cells={[g.name, rolesOf(g.id), permissionsOf(g.id)]} label={g.name} editHref={`/groups/${g.id}/edit`} deleteAction={deleteGroup.bind(null, g.id)} />
      ))}
    </ListPage>
  );
}
