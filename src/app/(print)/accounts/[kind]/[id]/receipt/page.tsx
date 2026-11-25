import { requirePermission } from "@/lib/authorization";
import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsAccounttype as accountType,
  accountsInstallment as installment,
  accountsPayment as payment,
  accountsSupplier as supplier,
  studentsGuardian as guardian,
  studentsStudent as student,
} from "@/db/schema/app";
import {
  PAYMENT_METHODS,
  ZERO,
  formatDate,
  formatMoney,
  installmentBalance,
  label,
  money,
  principal,
  today,
} from "@/lib/finance";
import { amountInWords, formatDocument } from "@/lib/format";
import { idParam, param } from "@/lib/list";
import { enrollmentTypeLabel, getEnrollment } from "../../../../../(app)/enrollments/data";
import { KINDS, kindParam } from "../../../../../(app)/accounts/kinds";
import { PrintToolbar } from "../../../../print-toolbar";

export const metadata: Metadata = { title: "Comprovante de pagamento" };

const cell = "border border-gray-900 px-1.5 py-0.5";

export default async function ReceiptPage({ params, searchParams }: PageProps<"/accounts/[kind]/[id]/receipt">) {
  const kind = await kindParam(params);
  await requirePermission(KINDS[kind].resource, "view");
  const id = await idParam(params);
  const [row] = await db
    .select({ a: account, category: accountType.name })
    .from(account)
    .innerJoin(accountType, eq(account.categoryId, accountType.id))
    .where(and(eq(account.id, id), eq(account.direction, KINDS[kind].direction)));
  if (!row) notFound();
  const a = row.a;

  // ?installment=<id> narrows the receipt to one installment of this account
  const installmentParam = param(await searchParams, "installment");
  let only: typeof installment.$inferSelect | undefined;
  if (installmentParam) {
    if (!/^\d+$/.test(installmentParam)) notFound();
    [only] = await db
      .select()
      .from(installment)
      .where(and(eq(installment.id, Number(installmentParam)), eq(installment.accountId, id)));
    if (!only) notFound();
  }

  const payments = await db
    .select({
      p: payment,
      number: installment.number,
      dueDate: installment.dueDate,
      installmentAmount: installment.amount,
      installmentStatus: installment.status,
    })
    .from(payment)
    .innerJoin(installment, eq(payment.installmentId, installment.id))
    .where(and(eq(installment.accountId, id), only ? eq(installment.id, only.id) : undefined))
    .orderBy(asc(payment.paidAt), asc(installment.number), asc(payment.id));

  // Balance right after each payment, not today's balance
  const paidSoFar = new Map<number, ReturnType<typeof money>>();
  const lines = payments.map((r) => {
    const paid = (paidSoFar.get(r.p.installmentId) ?? ZERO).plus(principal(r.p));
    paidSoFar.set(r.p.installmentId, paid);
    return { ...r, balanceAfter: installmentBalance(r.installmentAmount, "A", paid) };
  });
  const total = lines.reduce((s, r) => s.plus(money(r.p.amount)), ZERO);
  // One cheque may pay several installments (batch): list each cheque once
  const cheques = [
    ...new Map(
      lines
        .filter((r) => r.p.checkNumber)
        .map((r) => [[r.p.checkBank, r.p.checkBranch, r.p.checkAccount, r.p.checkNumber].join("|"), r.p]),
    ).values(),
  ];
  const byMethod = new Map<string, ReturnType<typeof money>>();
  for (const r of lines) byMethod.set(r.p.method, (byMethod.get(r.p.method) ?? ZERO).plus(money(r.p.amount)));

  // Account.payer: the guardian, or a self-financial student
  const [[payerGuardian], [s], [sup], contract] = await Promise.all([
    a.guardianId ? db.select().from(guardian).where(eq(guardian.id, a.guardianId)) : [],
    a.studentId ? db.select().from(student).where(eq(student.id, a.studentId)) : [],
    a.supplierId ? db.select().from(supplier).where(eq(supplier.id, a.supplierId)) : [],
    a.enrollmentId ? getEnrollment(a.enrollmentId) : null,
  ]);
  const payer = payerGuardian ?? (s?.isSelfFinancial ? s : undefined);
  const receivable = a.direction === "R";

  // One copy for the guardian (or supplier), one the school keeps; cut on the dashed line
  const copy = (via: string) => (
    <div className="break-inside-avoid border border-gray-900">
      <header className="flex items-center justify-between border-b border-gray-900 px-2 py-1.5">
        <div className="text-[10pt]">
          <p className="text-[11pt] font-bold">ASA SUL (MATRIZ)</p>
          <p>CNPJ: 34.270.139/0001-77</p>
          <p>SGAS 606 BLOCO F PARTE A, ASA SUL, Brasília - DF, CEP: 70200-660</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- print page */}
        <img src="/img/Logo_light.png" alt="Único Educacional" className="h-12 w-auto" />
      </header>
      <h1 className="border-b border-gray-900 bg-gray-200 p-1 text-center font-sans text-[12pt] font-bold">
        COMPROVANTE DE PAGAMENTO (RECIBO)
        <span className="ml-2 text-[9pt] font-normal">({via})</span>
      </h1>
      <section className="border-b border-gray-900 px-2 py-1.5">
        <p className="mb-1.5 font-bold">
          {receivable ? "Recebemos do(s) responsável(eis) abaixo:" : "Pagamos ao fornecedor abaixo:"}
        </p>
        <table>
          <tbody>
            <tr className="text-[11pt] font-bold">
              <td className="pr-4 align-top">{receivable ? "Valor recebido:" : "Valor pago:"}</td>
              <td>
                {formatMoney(total)} ({amountInWords(total)})
              </td>
            </tr>
            <tr className="font-bold">
              <td className="pr-4 align-top">Forma pagamento:</td>
              <td>
                {byMethod.size === 0
                  ? "-"
                  : [...byMethod].map(([method, amount]) => (
                      <span key={method} className="block">
                        {label(PAYMENT_METHODS, method)}: R$ {formatMoney(amount)}
                      </span>
                    ))}
              </td>
            </tr>
            {cheques.length > 0 && (
              <tr>
                <td className="pr-4 align-top">{cheques.length > 1 ? "Cheques:" : "Cheque:"}</td>
                <td>
                  {cheques.map((c) => (
                    <span key={c.id} className="block">
                      nº {c.checkNumber} · banco {c.checkBank} · ag. {c.checkBranch} · conta {c.checkAccount}
                      {c.checkDate && ` · bom para ${formatDate(c.checkDate)}`} · titular {c.checkHolderName} (CPF{" "}
                      {formatDocument(c.checkHolderCpf)})
                    </span>
                  ))}
                </td>
              </tr>
            )}
            <tr>
              <td className="pr-4">Lançamento Nº:</td>
              <td>{a.id}</td>
            </tr>
            {only && (
              <tr>
                <td className="pr-4">Parcela:</td>
                <td>
                  {only.number}ª - vencimento {formatDate(only.dueDate)}
                </td>
              </tr>
            )}
            <tr>
              <td className="pr-4">Descrição:</td>
              <td>{a.description}</td>
            </tr>
          </tbody>
        </table>
      </section>
      {receivable ? (
        <>
          {contract ? (
            <p className="border-b border-gray-900 px-2 py-0.5 text-[10pt] font-bold">{`${contract.studentName} - ${enrollmentTypeLabel(contract.program, contract.level, contract.schoolYear)}`}</p>
          ) : (
            s && (
              <p className="border-b border-gray-900 px-2 py-0.5 text-[10pt] font-bold">
                Aluno(a): {s.useSocialName && s.socialName ? s.socialName : s.name}
              </p>
            )
          )}
          {payer && (
            <>
              <p className="border-b border-gray-900 px-2 py-0.5">
                Responsável(eis): CPF/CNPJ: {formatDocument(payer.cpf)} {payer.name}
              </p>
              <p className="border-b border-gray-900 px-2 py-0.5">
                Endereço: {payer.address}
                {payer.neighborhood && `, ${payer.neighborhood}`}
                {payer.city && `, ${payer.city} - ${payer.state}`}
                {payer.zipCode && ` CEP: ${payer.zipCode.slice(0, 5)}-${payer.zipCode.slice(5)}`}
              </p>
            </>
          )}
        </>
      ) : (
        sup && (
          <p className="border-b border-gray-900 px-2 py-0.5 text-[10pt] font-bold">
            Fornecedor: {sup.name}
            {sup.document && ` - CPF/CNPJ: ${formatDocument(sup.document)}`}
          </p>
        )
      )}
      <table className="w-full border-collapse text-right">
        <thead>
          <tr className="bg-gray-200 text-center">
            {[
              "Parcela",
              "Vencimento",
              "Pagamento",
              "Valor",
              "Multa",
              "Juros",
              "Desconto",
              "Correção",
              "Vlr Pago",
              "Saldo",
              "Finalidade",
            ].map((h) => (
              <th key={h} className={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={11} className={`${cell} text-center text-gray-600`}>
                Nenhum pagamento registrado para esta {only ? "parcela" : "conta"}.
              </td>
            </tr>
          )}
          {lines.map((r) => (
            <tr key={r.p.id}>
              <td className={`${cell} text-center`}>{r.number}ª</td>
              <td className={`${cell} text-center`}>{formatDate(r.dueDate)}</td>
              <td className={`${cell} text-center`}>{formatDate(r.p.paidAt)}</td>
              <td className={cell}>{formatMoney(r.installmentAmount)}</td>
              <td className={cell}>{formatMoney(r.p.penalty)}</td>
              <td className={cell}>{formatMoney(r.p.interest)}</td>
              <td className={cell}>{formatMoney(r.p.discount)}</td>
              <td className={cell}>{formatMoney(r.p.monetaryAdjust)}</td>
              <td className={cell}>{formatMoney(r.p.amount)}</td>
              <td className={cell}>{formatMoney(r.balanceAfter)}</td>
              <td className={`${cell} text-center`}>{row.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mx-2 mt-3 mb-8 text-right">
        Brasília-DF,{" "}
        {new Intl.DateTimeFormat("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${today()}T00:00:00Z`))}
        .
      </p>
      <p className="mx-auto mb-4 w-1/2 border-t border-gray-900 pt-1 text-center">Departamento Financeiro</p>
    </div>
  );

  return (
    <>
      <PrintToolbar />
      <main className="mx-auto my-6 max-w-[210mm] bg-white p-[10mm] font-serif text-[9pt] shadow-lg print:m-0 print:max-w-none print:p-0 print:shadow-none">
        <style>{"@page { size: A4 portrait; margin: 10mm; }"}</style>
        {copy(receivable ? "Via do responsável" : "Via do fornecedor")}
        <div className="my-[6mm] border-t-2 border-dashed border-gray-500" aria-hidden />
        {copy("Via da escola")}
      </main>
    </>
  );
}
