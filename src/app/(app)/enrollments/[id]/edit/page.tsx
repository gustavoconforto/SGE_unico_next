import { asc, desc, eq } from "drizzle-orm";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallmentActions } from "@/components/installment-table";
import { LinkButton } from "@/components/link-button";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsAccounttype as accountType,
  accountsInstallment as installment,
  enrollmentsDiscounttype as discountType,
  enrollmentsEnrollmentdiscount as enrollmentDiscount,
  enrollmentsEnrollmentneededdocument as enrollmentDocument,
  enrollmentsNeededdocumenttype as documentType,
  studentsGuardian as guardian,
} from "@/db/schema/app";
import { ENROLLMENT_STATUSES, INSTALLMENT_STATUSES, accountSituation, formatDate, formatMoney, isOverdue, label, money, today } from "@/lib/finance";
import { accountSummary, outstandingSql, syncDocuments } from "@/lib/finance-db";
import { idParam } from "@/lib/list";
import { classOptions, classesFor, enrollmentTypeLabel, enrollmentTypeOptions, getEnrollment } from "../../data";
import { EnrollmentEditForm } from "../../enrollment-edit-form";

export const metadata: Metadata = { title: "Matrícula" };

function Section({ title, help, action, children }: { title: string; help?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {help && <p className="text-sm text-gray-500">{help}</p>}
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export default async function EditEnrollmentPage({ params }: PageProps<"/enrollments/[id]/edit">) {
  const id = await idParam(params);
  const row = await getEnrollment(id);
  if (!row) notFound();
  // Django syncs the checklist on every GET, so new required documents show up on old enrollments
  await syncDocuments(db, id);

  const on = today();
  const [types, classes, discounts, documents, [contract], receivables] = await Promise.all([
    enrollmentTypeOptions(),
    classOptions(),
    db
      .select({ id: enrollmentDiscount.id, group: enrollmentDiscount.group, percentage: enrollmentDiscount.percentage, observation: enrollmentDiscount.observation, type: discountType.description })
      .from(enrollmentDiscount)
      .leftJoin(discountType, eq(enrollmentDiscount.discountTypeId, discountType.id))
      .where(eq(enrollmentDiscount.enrollmentId, id))
      .orderBy(asc(enrollmentDiscount.group), asc(enrollmentDiscount.id)),
    db
      .select({ id: enrollmentDocument.id, type: documentType.description, isDelivered: enrollmentDocument.isDelivered })
      .from(enrollmentDocument)
      .innerJoin(documentType, eq(enrollmentDocument.typeId, documentType.id))
      .where(eq(enrollmentDocument.enrollmentId, id))
      .orderBy(asc(documentType.description)),
    db.select({ id: account.id }).from(account).where(eq(account.enrollmentId, id)),
    db
      .select({
        id: account.id,
        issueDate: account.issueDate,
        description: account.description,
        category: accountType.name,
        guardian: guardian.name,
        gross: account.grossValue,
        discount: account.discountValue,
        ...accountSummary(on),
      })
      .from(account)
      .innerJoin(accountType, eq(account.categoryId, accountType.id))
      .leftJoin(guardian, eq(account.guardianId, guardian.id))
      .where(eq(account.studentId, row.e.studentId))
      .orderBy(desc(account.issueDate), asc(account.description)),
  ]);
  const installments = contract
    ? await db
        .select({ id: installment.id, number: installment.number, dueDate: installment.dueDate, amount: installment.amount, status: installment.status, outstanding: outstandingSql })
        .from(installment)
        .where(eq(installment.accountId, contract.id))
        .orderBy(asc(installment.number))
    : null;

  const type = types.find((t) => t.id === row.e.enrollmentTypeId);
  const typeLabel = enrollmentTypeLabel(row.program, row.level, row.schoolYear);
  // What staff open this page to check: is anything overdue, and how much is still owed
  const overdue = installments?.filter((i) => isOverdue(i.status, i.dueDate, on)) ?? [];
  const overdueTotal = overdue.reduce((sum, i) => sum.plus(money(i.outstanding)), money(0));
  const owed = installments?.reduce((sum, i) => sum.plus(money(i.outstanding)), money(0)) ?? money(0);
  const classChoices = classesFor(classes, type).map((c) => [c.id, c.label] as [number, string]);

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Matrícula de {row.studentName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            {typeLabel}
            <Badge color={row.e.status === "A" ? "success" : "gray"} className="w-fit">
              {label(ENROLLMENT_STATUSES, row.e.status)}
            </Badge>
          </p>
          {installments && (
            <p className={`mt-2 text-sm tabular-nums ${overdue.length ? "font-medium text-red-700" : "text-gray-700"}`}>
              {overdue.length
                ? `${overdue.length} ${overdue.length === 1 ? "parcela vencida" : "parcelas vencidas"} · R$ ${formatMoney(overdueTotal)} em atraso`
                : "Nenhuma parcela vencida"}
              {!owed.isZero() && <span className="font-normal text-gray-600"> · R$ {formatMoney(owed)} ainda a receber no contrato</span>}
            </p>
          )}
        </div>
        <LinkButton href={`/grades/report-card/${id}`} color="alternative">
          Boletim
        </LinkButton>
      </div>
      <EnrollmentEditForm
        id={id}
        locked={[
          ["Contrato", typeLabel],
          ["Data da matrícula", formatDate(row.e.enrolledAt)],
          ["Dia de vencimento", String(row.e.dueDay)],
        ]}
        defaults={row.e}
        classes={classChoices}
        documents={documents}
      />

      <Section title="Descontos" help="Definidos na matrícula; a conta já foi gerada com a soma de cada grupo de parcelas.">
        {discounts.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum desconto nesta matrícula.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Desconto</TableHeadCell>
                <TableHeadCell>Parcelas</TableHeadCell>
                <TableHeadCell>Observação</TableHeadCell>
                <TableHeadCell className="text-right">Percentual</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {discounts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.type ?? "Desconto avulso"}</TableCell>
                  <TableCell>{d.group === "F" ? "1ª parcela" : "Demais parcelas"}</TableCell>
                  <TableCell>{d.observation || "—"}</TableCell>
                  <TableCell className="text-right">{formatMoney(d.percentage)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Parcelas">
        {!installments ? (
          <p className="text-sm text-gray-500">Nenhuma duplicata gerada para esta matrícula.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell className="w-20">Parcela</TableHeadCell>
                <TableHeadCell>Vencimento</TableHeadCell>
                <TableHeadCell className="text-right">Valor</TableHeadCell>
                <TableHeadCell>Situação</TableHeadCell>
                <TableHeadCell className="text-right">Faltante</TableHeadCell>
                <TableHeadCell>Ações</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {installments.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.number}</TableCell>
                  <TableCell>{formatDate(i.dueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(i.amount)}</TableCell>
                  <TableCell>
                    {isOverdue(i.status, i.dueDate, on) ? (
                      <Badge color="failure" className="w-fit">
                        Vencida
                      </Badge>
                    ) : (
                      <Badge color={i.status === "Q" ? "success" : "gray"} className="w-fit">
                        {label(INSTALLMENT_STATUSES, i.status)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(i.outstanding)}</TableCell>
                  <TableCell>
{contract && <InstallmentActions receiptHref={`/accounts/receivable/${contract.id}/receipt`} installment={i} />}
</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section
        title="Contas a receber"
        help="Todas as cobranças do aluno, incluindo o contrato."
        action={
          <LinkButton href={`/accounts/receivable/new?enrollment=${id}`} size="xs" color="alternative">
            Nova conta a receber
          </LinkButton>
        }
      >
        {receivables.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conta a receber para este aluno.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Emissão</TableHeadCell>
                <TableHeadCell>Descrição</TableHeadCell>
                <TableHeadCell>Responsável</TableHeadCell>
                <TableHeadCell className="text-right">Valor líquido</TableHeadCell>
                <TableHeadCell>Situação</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receivables.map((a) => {
                const situation = accountSituation(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell>{formatDate(a.issueDate)}</TableCell>
                    <TableCell>
                      <Link className="text-blue-600 hover:underline dark:text-blue-400" href={`/accounts/receivable/${a.id}/edit`}>
                        {a.description}
                      </Link>
                      <span className="block text-xs text-gray-500">{a.category}</span>
                    </TableCell>
                    <TableCell>{a.guardian ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(money(a.gross).minus(money(a.discount)))}</TableCell>
                    <TableCell>
                      <Badge color={situation === "Quitada" ? "success" : situation === "Vencida" ? "failure" : "gray"} className="w-fit">
                        {situation}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
