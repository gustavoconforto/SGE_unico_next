import { asc } from "drizzle-orm";
import { db } from "@/db";
import { documentsDocumenttype as documentType } from "@/db/schema/app";

export async function documentTypeOptions(): Promise<[number, string][]> {
  return (await db.select().from(documentType).orderBy(asc(documentType.type))).map((t) => [t.id, t.type]);
}
