import { asc } from "drizzle-orm";
import { db } from "@/db";
import { studentsGuardian as guardian } from "@/db/schema/app";
import type { GuardianOption } from "./guardian-rows";

// shortcut: loads every guardian into a <select> (184 in the seed); switch to a search box past a few thousand
export function guardianOptions(): Promise<GuardianOption[]> {
  return db.select({ id: guardian.id, name: guardian.name, mobile: guardian.mobile }).from(guardian).orderBy(asc(guardian.name));
}
