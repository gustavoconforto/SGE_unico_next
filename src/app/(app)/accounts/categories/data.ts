// Not in actions.ts: every export of a "use server" file is a public endpoint.
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { accountsAccount as account } from "@/db/schema/app";

export async function accountsInCategory(id: number) {
  const [{ n }] = await db.select({ n: count() }).from(account).where(eq(account.categoryId, id));
  return n;
}
