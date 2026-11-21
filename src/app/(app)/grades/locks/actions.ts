"use server";

import { and, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { gradesGradelock as lock } from "@/db/schema/app";
import { requireSession } from "@/lib/session";

/** The "subjectId:bimester" keys posted under `name`. */
const keys = (formData: FormData, name: string) => new Set(formData.getAll(name).map(String).filter((v) => /^\d+:[1-5]$/.test(v)));
const row = (key: string) => {
  const [subjectId, bimester] = key.split(":").map(Number);
  return { subjectId, bimester };
};

/**
 * Applies only what this form changed (`shown` = the locks it loaded with), so a stale page can't undo a lock
 * someone else saved meanwhile.
 */
export async function saveGradeLocks(formData: FormData) {
  await requireSession();
  const shown = keys(formData, "shown");
  const checked = keys(formData, "lock");
  const removed = [...shown].filter((k) => !checked.has(k)).map(row);
  const added = [...checked].filter((k) => !shown.has(k)).map(row);
  await db.transaction(async (tx) => {
    if (removed.length) await tx.delete(lock).where(or(...removed.map((r) => and(eq(lock.subjectId, r.subjectId), eq(lock.bimester, r.bimester)))));
    if (added.length) await tx.insert(lock).values(added).onConflictDoNothing();
  });
  redirect("/grades/locks?msg=updated");
}
