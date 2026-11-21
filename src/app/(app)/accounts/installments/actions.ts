"use server";

import { eq, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accountsInstallment as installment } from "@/db/schema/app";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { initialStatus } from "@/lib/finance";
import { type FormState, INVALID_CHOICE, decimalField, foreignKey, optionalSmallInt, parseForm, requiredDate } from "@/lib/form";
import { requireSession } from "@/lib/session";

const installmentSchema = z.object({ accountId: foreignKey, number: optionalSmallInt, dueDate: requiredDate, amount: decimalField({ min: 0 }) });

export async function createInstallment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(installmentSchema, formData);
  if (!data) return state;
  try {
    // Blank number: the account's next one
    const number =
      data.number ??
      ((
        await db
          .select({ last: max(installment.number) })
          .from(installment)
          .where(eq(installment.accountId, data.accountId))
      )[0].last ?? 0) + 1;
    await db.insert(installment).values({ ...data, number, status: initialStatus(data.amount) });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION)
      // Left blank: someone else took the next number a moment ago
      return data.number === null
        ? { formError: "Outra parcela acabou de ser criada nesta conta. Salve novamente.", values }
        : { errors: { number: ["Parcela com este Conta e Número da parcela já existe."] }, values };
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) return { errors: { accountId: [INVALID_CHOICE] }, values };
    throw error;
  }
  redirect("/accounts/installments?msg=installment_created");
}
