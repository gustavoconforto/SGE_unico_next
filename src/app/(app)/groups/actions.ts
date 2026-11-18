"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accessGroup as group, accessGroupPermissions as groupPermission, accessGroupRoles as groupRole } from "@/db/schema/app";
import { requirePermission } from "@/lib/access";
import { deleteAndRedirect } from "@/lib/crud";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, INVALID_CHOICE, formIds, parseForm, requiredText } from "@/lib/form";
import { isPermission } from "@/lib/permissions";

const groupSchema = z.object({ name: requiredText(150) });

export async function saveGroup(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("groups.manage");
  const roleIds = formIds(formData, "roles");
  // Only codes the system knows: a tampered or outdated form can't store anything else
  const codes = [...new Set(formData.getAll("permissions").map(String).filter(isPermission))];
  const { data, values, state } = parseForm(groupSchema, formData);
  values.roles = roleIds.join(",");
  values.permissions = codes.join(",");
  if (!data) return { ...state, values };

  try {
    await db.transaction(async (tx) => {
      let groupId = id;
      if (groupId === null) [{ id: groupId }] = await tx.insert(group).values(data).returning({ id: group.id });
      else await tx.update(group).set(data).where(eq(group.id, groupId));
      await tx.delete(groupRole).where(eq(groupRole.groupId, groupId));
      await tx.delete(groupPermission).where(eq(groupPermission.groupId, groupId));
      if (roleIds.length) await tx.insert(groupRole).values(roleIds.map((roleId) => ({ groupId: groupId!, roleId })));
      if (codes.length) await tx.insert(groupPermission).values(codes.map((codename) => ({ groupId: groupId!, codename })));
    });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { name: ["Grupo com este Nome já existe."] }, values };
    // A role deleted while the form was open
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) return { formError: INVALID_CHOICE, values };
    throw error;
  }
  redirect(`/groups?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteGroup(id: number) {
  await requirePermission("groups.manage");
  // Role and permission links cascade with the group
  await deleteAndRedirect(() => db.delete(group).where(eq(group.id, id)), "/groups");
}
