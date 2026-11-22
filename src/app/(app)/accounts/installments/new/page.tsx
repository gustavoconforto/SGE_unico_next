import { requirePermission } from "@/lib/authorization";
import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { accountsAccount as account, accountsSupplier as supplier, studentsGuardian as guardian } from "@/db/schema/app";
import { DIRECTIONS, label } from "@/lib/finance";
import { param } from "@/lib/list";
import { InstallmentForm } from "../installment-form";

export const metadata: Metadata = { title: "Nova parcela" };

export default async function NewInstallmentPage({ searchParams }: PageProps<"/accounts/installments/new">) {
  await requirePermission("finance", "edit");
  const rows = await db
    .select({ id: account.id, direction: account.direction, description: account.description, guardian: guardian.name, supplier: supplier.name })
    .from(account)
    .leftJoin(guardian, eq(account.guardianId, guardian.id))
    .leftJoin(supplier, eq(account.supplierId, supplier.id))
    .orderBy(desc(account.issueDate), asc(account.description));
  // "[A receber] Contrato Ana - Maria Souza" (AccountChoiceField)
  const accounts = rows.map((a) => {
    const counterpart = a.guardian ?? a.supplier;
    return [a.id, `[${label(DIRECTIONS, a.direction)}] ${a.description}${counterpart ? ` - ${counterpart}` : ""}`] as [number, string];
  });
  const accountId = Number(param(await searchParams, "account")) || null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova parcela</h1>
      <InstallmentForm accounts={accounts} defaults={accountId && rows.some((a) => a.id === accountId) ? { accountId } : undefined} />
    </div>
  );
}
