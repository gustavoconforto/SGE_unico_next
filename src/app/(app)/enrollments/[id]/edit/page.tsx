import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Badge, Button, Checkbox, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallmentActions } from "@/components/installment-table";
import { hasPermission } from "@/lib/authorization";
import { LinkButton } from "@/components/link-button";
import { ACTIONS_CELL, PHONE_CARDS, PRIMARY_CELL } from "@/components/list-page";
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
  studentsGuardianassociation as guardianLink,
} from "@/db/schema/app";
import { ENROLLMENT_STATUSES, INSTALLMENT_STATUSES, PENDING_STATUSES, accountSituation, formatDate, formatMoney, isOverdue, label, money, today } from "@/lib/finance";
import { accountSummary, financialGuardians, outstandingSql, syncDocuments } from "@/lib/finance-db";
import { idParam } from "@/lib/list";
import { classOptions, classesFor, enrollmentTypeLabel, enrollmentTypeOptions, getEnrollment } from "../../data";
import { EnrollmentEditForm } from "../../enrollment-edit-form";
import { PrintMenu } from "../../print-menu";

export const metadata: Metadata = { title: "Matrícula" };

/** A titled block on the page floor; its table brings its own white panel. */
function Section({ id, title, help, action, children }: { id?: string; title: string; help?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {help && <p className="text-sm text-gray-600">{help}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The list pages' cell padding: ~44px rows instead of Flowbite's 56px. */
const DENSE = "[&_td]:px-2.5 [&_td]:py-2.5 [&_th]:px-2.5";

/** Names the column on a phone card, where the header row is hidden. */
function PhoneLabel({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-normal text-gray-500 sm:hidden">{children}</span>;
}

export default async function EditEnrollmentPage({ params }: PageProps<"/enrollments/[id]/edit">) {
  const id = await idParam(params);
  const row = await getEnrollment(id);
  if (!row) notFound();
  // Django syncs the checklist on every GET, so new required documents show up on old enrollments
  await syncDocuments(db, id);

  const on = today();
  const canPay = await hasPermission("payments", "edit");
  const [types, classes, discounts, documents, [contract], receivables, [payer], parents] = await Promise.all([
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
    financialGuardians(db, row.e.studentId).limit(1),
    db
      .select({ relationship: guardianLink.relationship })
      .from(guardianLink)
      .where(and(eq(guardianLink.studentId, row.e.studentId), inArray(guardianLink.relationship, ["PAI", "MAE"]))),
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
  // The installment to collect now: labelled action on it and on the overdue ones, icons on the rest
  const nextDue = installments?.find((i) => PENDING_STATUSES.includes(i.status) && !isOverdue(i.status, i.dueDate, on));
  const pending = installments?.filter((i) => PENDING_STATUSES.includes(i.status)) ?? [];
  const delivered = documents.filter((d) => d.isDelivered).length;
  const classChoices = classesFor(classes, type).map((c) => [c.id, c.label] as [number, string]);
  // Django's print guards (financial payer; father and mother for the ficha), shown before the click
  const hasPayer = row.studentSelfFinancial || !!payer;
  const hasParents = ["PAI", "MAE"].every((code) => parents.some((p) => p.relationship === code));

  return (
    <div className="flex max-w-4xl flex-col gap-8">
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
          {documents.length > 0 && (
            <p className="mt-1 text-sm text-gray-700 tabular-nums">
              <Link href="#matricula" className="underline-offset-2 hover:text-primary-700 hover:underline">
                {delivered === documents.length ? "Todos os documentos entregues" : `${delivered} de ${documents.length} documentos entregues`}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <PrintMenu
            id={id}
            blocked={{
              contrato: hasPayer ? null : "Requer responsável financeiro",
              requerimento: hasPayer ? null : "Requer responsável financeiro",
              ficha: !hasPayer ? "Requer responsável financeiro" : hasParents ? null : "Requer pai e mãe cadastrados",
            }}
          />
          <LinkButton href={`/grades/report-card/${id}`} color="alternative">
            Boletim
          </LinkButton>
        </div>
      </div>

      <Section
        title="Parcelas"
        help={canPay && pending.length > 1 ? "Para registrar a baixa de várias parcelas de uma vez, marque-as e use “Baixar selecionadas”." : undefined}
        action={
          canPay &&
          pending.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" form="batch-payment" size="xs" color="alternative">
                Baixar selecionadas
              </Button>
              <LinkButton href={`/accounts/payments/batch?${new URLSearchParams([["enrollment", String(id)], ...pending.map((i) => ["installment", String(i.id)])])}`} size="xs" color="alternative">
                Baixar todas em aberto ({pending.length})
              </LinkButton>
            </div>
          )
        }
      >
        {!installments ? (
          <p className="text-sm text-gray-600">Nenhuma duplicata gerada para esta matrícula.</p>
        ) : (
          // A plain GET form: the checked installments become ?installment=… on the batch payment page
          <form id="batch-payment" action="/accounts/payments/batch" className="overflow-x-auto">
            <input type="hidden" name="enrollment" value={id} />
            <Table className={`${DENSE} ${PHONE_CARDS}`}>
              <TableHead>
                <TableRow>
                  <TableHeadCell className="w-20">Parcela</TableHeadCell>
                  <TableHeadCell>Vencimento</TableHeadCell>
                  <TableHeadCell className="text-right">Valor</TableHeadCell>
                  <TableHeadCell>Situação</TableHeadCell>
                  <TableHeadCell className="text-right">Faltante</TableHeadCell>
                  <TableHeadCell className="w-px text-right">Ações</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {installments.map((i) => {
                  const late = isOverdue(i.status, i.dueDate, on);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className={`${PRIMARY_CELL} tabular-nums`}>
                        <label className="flex items-center gap-2">
                          {canPay && pending.length > 1 && PENDING_STATUSES.includes(i.status) ? (
                            <Checkbox name="installment" value={i.id} aria-label={`Selecionar a parcela ${i.number}`} />
                          ) : (
                            canPay && pending.length > 1 && <span className="w-4" aria-hidden="true" />
                          )}
                          <span>
                            <span className="sm:hidden">Parcela </span>
                            {i.number}
                          </span>
                        </label>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        <PhoneLabel>Vencimento</PhoneLabel>
                        {formatDate(i.dueDate)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums max-sm:text-left">
                        <PhoneLabel>Valor</PhoneLabel>
                        {formatMoney(i.amount)}
                      </TableCell>
                      <TableCell>
                        <PhoneLabel>Situação</PhoneLabel>
                        {late ? (
                          <Badge color="failure" className="w-fit whitespace-nowrap">
                            Vencida
                          </Badge>
                        ) : (
                          <Badge color={i.status === "Q" ? "success" : "gray"} className="w-fit whitespace-nowrap">
                            {label(INSTALLMENT_STATUSES, i.status)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums max-sm:text-left">
                        <PhoneLabel>Faltante</PhoneLabel>
                        {formatMoney(i.outstanding)}
                      </TableCell>
                      <TableCell className={ACTIONS_CELL}>
                        {contract && (
                          <InstallmentActions receiptHref={`/accounts/receivable/${contract.id}/receipt`} installment={i} due={late || i.id === nextDue?.id} enrollmentId={id} canPay={canPay} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </form>
        )}
      </Section>

      <section id="matricula" className="scroll-mt-20">
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
      </section>

      <Section title="Descontos" help="Definidos na matrícula; a conta já foi gerada com a soma de cada grupo de parcelas.">
        {discounts.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum desconto nesta matrícula.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className={DENSE}>
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
                    <TableCell className="font-medium text-gray-900">{d.type ?? "Desconto avulso"}</TableCell>
                    <TableCell>{d.group === "F" ? "1ª parcela" : "Demais parcelas"}</TableCell>
                    <TableCell>{d.observation || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums max-sm:text-left">{formatMoney(d.percentage)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
          <p className="text-sm text-gray-600">Nenhuma conta a receber para este aluno.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className={`${DENSE} ${PHONE_CARDS}`}>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Emissão</TableHeadCell>
                  <TableHeadCell>Descrição</TableHeadCell>
                  <TableHeadCell>Responsável</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap text-right">Valor líquido</TableHeadCell>
                  <TableHeadCell>Situação</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receivables.map((a) => {
                  const situation = accountSituation(a);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        <PhoneLabel>Emissão</PhoneLabel>
                        {formatDate(a.issueDate)}
                      </TableCell>
                      <TableCell className={PRIMARY_CELL}>
                        <Link className="underline-offset-2 hover:text-primary-700 hover:underline" href={`/accounts/receivable/${a.id}/edit`}>
                          {a.description}
                        </Link>
                        <span className="block text-xs font-normal text-gray-500">{a.category}</span>
                      </TableCell>
                      <TableCell>
                        <PhoneLabel>Responsável</PhoneLabel>
                        {/* No guardian on the account: the student pays for themself when marked so */}
                        {a.guardian ?? (row.studentSelfFinancial ? "O próprio aluno" : "—")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums max-sm:text-left">
                        <PhoneLabel>Valor líquido</PhoneLabel>
                        {formatMoney(money(a.gross).minus(money(a.discount)))}
                      </TableCell>
                      <TableCell>
                        <PhoneLabel>Situação</PhoneLabel>
                        <Badge color={situation === "Quitada" ? "success" : situation === "Vencida" ? "failure" : "gray"} className="w-fit whitespace-nowrap">
                          {situation}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}
