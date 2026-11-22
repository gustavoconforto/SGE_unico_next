import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { accountsAccounttype as accountType } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { accountsInCategory } from "../../data";
import { CategoryForm } from "../../category-form";

export const metadata: Metadata = { title: "Editar categoria" };

export default async function EditCategoryPage({ params }: PageProps<"/accounts/categories/[id]/edit">) {
  await requirePermission("finance", "edit");
  const id = await idParam(params);
  const [[row], inUse] = await Promise.all([db.select().from(accountType).where(eq(accountType.id, id)), accountsInCategory(id)]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar categoria financeira</h1>
      <CategoryForm id={id} defaults={row} directionLocked={inUse > 0} />
    </div>
  );
}
