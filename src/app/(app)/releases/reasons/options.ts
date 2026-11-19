import { asc } from "drizzle-orm";
import { db } from "@/db";
import { releasesExitreason as reason } from "@/db/schema/app";

export async function reasonOptions(): Promise<[number, string][]> {
  return (await db.select().from(reason).orderBy(asc(reason.reason))).map((r) => [r.id, r.reason]);
}
