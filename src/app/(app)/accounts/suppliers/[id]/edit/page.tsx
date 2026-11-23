import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { accountsSupplier as supplier } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { SupplierForm } from "../../supplier-form";

export const metadata: Metadata = { title: "Editar fornecedor" };

export default async function EditSupplierPage({ params }: PageProps<"/accounts/suppliers/[id]/edit">) {
  await requirePermission("finance", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(supplier).where(eq(supplier.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar fornecedor — {row.name}</h1>
      <SupplierForm id={id} defaults={row} />
    </div>
  );
}
