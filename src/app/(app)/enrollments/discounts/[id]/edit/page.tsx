import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { enrollmentsDiscounttype as discountType } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { DiscountTypeForm } from "../../discount-form";

export const metadata: Metadata = { title: "Editar desconto" };

export default async function EditDiscountTypePage({ params }: PageProps<"/enrollments/discounts/[id]/edit">) {
  await requirePermission("enrollmentSetup", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(discountType).where(eq(discountType.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar desconto</h1>
      <DiscountTypeForm id={id} defaults={row} />
    </div>
  );
}
