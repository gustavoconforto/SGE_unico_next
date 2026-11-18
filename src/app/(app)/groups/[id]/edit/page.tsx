import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { accessGroup as group, accessGroupPermissions as groupPermission, accessGroupRoles as groupRole } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { roleOptions } from "../../../employees/roles";
import { GroupForm } from "../../group-form";

export const metadata: Metadata = { title: "Editar grupo" };

export default async function EditGroupPage({ params }: PageProps<"/groups/[id]/edit">) {
  const id = await idParam(params);
  const [[row], roleLinks, permissionRows, roles] = await Promise.all([
    db.select().from(group).where(eq(group.id, id)),
    db.select({ roleId: groupRole.roleId }).from(groupRole).where(eq(groupRole.groupId, id)),
    db.select({ codename: groupPermission.codename }).from(groupPermission).where(eq(groupPermission.groupId, id)),
    roleOptions(),
  ]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar grupo</h1>
      <GroupForm id={id} defaults={row} roleIds={roleLinks.map((l) => l.roleId)} codes={permissionRows.map((p) => p.codename)} roles={roles} />
    </div>
  );
}
