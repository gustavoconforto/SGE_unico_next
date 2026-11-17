import { asc } from "drizzle-orm";
import { db } from "@/db";
import { employeesEmployeeroletype as role } from "@/db/schema/app";

/** Role options for the employee <select>. */
export async function roleOptions(): Promise<[number, string][]> {
  const rows = await db.select().from(role).orderBy(asc(role.role));
  return rows.map((r) => [r.id, r.role]);
}
