import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accountsAccounttype as accountType, accountsSupplier as supplier, studentsGuardian as guardian, studentsGuardianassociation as guardianLink } from "@/db/schema/app";
import { studentOptions } from "../../enrollments/data";
import { KINDS, type Kind } from "../kinds";

export type AccountFormOptions = Awaited<ReturnType<typeof accountFormOptions>>;

/** Everything the account form's selects need, for one direction. */
export async function accountFormOptions(kind: Kind) {
  const categories = (await db.select({ id: accountType.id, name: accountType.name }).from(accountType).where(eq(accountType.direction, KINDS[kind].direction)).orderBy(asc(accountType.name))).map(
    (c) => [c.id, c.name] as [number, string],
  );
  if (kind === "payable") {
    const suppliers = (await db.select({ id: supplier.id, name: supplier.name }).from(supplier).orderBy(asc(supplier.name))).map((s) => [s.id, s.name] as [number, string]);
    return { categories, suppliers, students: [], guardians: [], financialByStudent: {} as Record<number, number[]> };
  }
  const [students, guardians, links] = await Promise.all([
    studentOptions(),
    db.select({ id: guardian.id, name: guardian.name }).from(guardian).orderBy(asc(guardian.name)),
    db.select({ studentId: guardianLink.studentId, guardianId: guardianLink.guardianId }).from(guardianLink).where(eq(guardianLink.isFinancial, true)),
  ]);
  const financialByStudent: Record<number, number[]> = {};
  for (const l of links) (financialByStudent[l.studentId] ??= []).push(l.guardianId);
  return { categories, suppliers: [] as [number, string][], students, guardians: guardians.map((g) => [g.id, g.name] as [number, string]), financialByStudent };
}
