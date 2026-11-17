// Database side of the finance rules: what Django did in model methods, querysets and signals
// (Installment.refresh_status, with_balance, with_installment_summary, create_enrollment_account, ...).
import { and, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { ref } from "./sql";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsAccounttype as accountType,
  accountsInstallment as installment,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmentneededdocument as enrollmentDocument,
  enrollmentsNeededdocumenttype as documentType,
  studentsGuardian as guardian,
  studentsGuardianassociation as guardianLink,
} from "@/db/schema/app";
import {
  type ContractValues,
  Direction,
  InstallmentStatus,
  PENDING_STATUSES,
  enrollmentInstallments,
  initialStatus,
  money,
  nextInstallmentStatus,
  toDb,
  today,
} from "./finance";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Conn = typeof db | Tx;

/** PENDING_STATUSES as an SQL list, for `status in (...)` in raw subqueries. */
export const pendingList = sql.join(PENDING_STATUSES.map((s) => sql`${s}`), sql`, `);

/** Principal paid on an installment (sum of amount − charges + discount over its payments). */
export const paidPrincipalSql = sql<string>`coalesce((select sum(p.amount - p.penalty - p.interest - p.monetary_adjust + p.discount) from accounts_payment p where p.installment_id = ${ref(installment.id)}), 0)`;

/** Installment.objects.with_balance(): what is still owed, 0 when cancelled. */
export const outstandingSql = sql<string>`(case when ${ref(installment.status)} = ${InstallmentStatus.CANCELLED} then 0 else greatest(${ref(installment.amount)} - ${paidPrincipalSql}, 0) end)`;

/** Account.objects.with_installment_summary(), as correlated subqueries (no join, so nothing is multiplied). */
export function accountSummary(on = today()) {
  const count = (where = sql`true`) =>
    sql<number>`(select count(*) from accounts_installment i where i.account_id = ${ref(account.id)} and ${where})::int`;
  return {
    total: count(),
    pending: count(sql`i.status in (${pendingList})`),
    overdue: count(sql`i.status in (${pendingList}) and i.due_date < ${on}`),
    paid: count(sql`i.status = ${InstallmentStatus.PAID}`),
  };
}

/** Account.situation filter (AccountListMixin.filter_status). */
export function accountStatusWhere(status: string, on = today()) {
  const s = accountSummary(on);
  switch (status) {
    case "pending":
      return sql`${s.pending} > 0`;
    case "overdue":
      return sql`${s.overdue} > 0`;
    case "paid":
      return sql`${s.pending} = 0 and ${s.paid} > 0`;
    case "cancelled":
      return sql`${s.total} > 0 and ${s.pending} = 0 and ${s.paid} = 0`;
    default:
      return undefined;
  }
}

/** Installment.refresh_status(): call inside the transaction that changed the installment's payments. */
export async function refreshInstallmentStatus(tx: Conn, installmentId: number) {
  const [row] = await tx
    .select({ status: installment.status, amount: installment.amount, paid: paidPrincipalSql })
    .from(installment)
    .where(eq(installment.id, installmentId));
  if (!row) return;
  const status = nextInstallmentStatus(row.status, row.amount, money(row.paid));
  if (status !== row.status) await tx.update(installment).set({ status }).where(eq(installment.id, installmentId));
}

/** Locks the installment row so two payments at once (a double click) are checked one after the other. */
export async function lockInstallment(tx: Tx, installmentId: number) {
  const [locked] = await tx.select({ id: installment.id }).from(installment).where(eq(installment.id, installmentId)).for("update");
  if (!locked) return undefined;
  // A separate statement after the lock: under READ COMMITTED it takes a fresh snapshot and so sees the
  // payment a concurrent submit just committed (in the locking statement itself the subquery would not)
  const [row] = await tx
    .select({ id: installment.id, amount: installment.amount, status: installment.status, accountId: installment.accountId, paid: paidPrincipalSql })
    .from(installment)
    .where(eq(installment.id, installmentId));
  return row;
}

/** Guardians marked financial for the student, by link order (Django's .first()). */
export function financialGuardians(conn: Conn, studentId: number) {
  return conn
    .select({ id: guardian.id, name: guardian.name })
    .from(guardian)
    .innerJoin(guardianLink, eq(guardianLink.guardianId, guardian.id))
    .where(and(eq(guardianLink.studentId, studentId), eq(guardianLink.isFinancial, true)))
    .orderBy(guardian.name);
}

/** Whether the student owes a past-due installment on any enrollment (blocks a new enrollment). */
export async function hasOverdueDebt(conn: Conn, studentId: number, on = today()) {
  const [row] = await conn
    .select({ id: installment.id })
    .from(installment)
    .innerJoin(account, eq(installment.accountId, account.id))
    .innerJoin(enrollment, eq(account.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.studentId, studentId), inArray(installment.status, PENDING_STATUSES), sql`${installment.dueDate} < ${on}`))
    .limit(1);
  return !!row;
}

const TUITION_CATEGORY = "Mensalidade";

async function tuitionCategoryId(tx: Tx) {
  await tx.insert(accountType).values({ name: TUITION_CATEGORY, direction: Direction.RECEIVABLE }).onConflictDoNothing();
  const [row] = await tx.select({ id: accountType.id }).from(accountType).where(eq(accountType.name, TUITION_CATEGORY));
  return row.id;
}

/** create_enrollment_account(): the contract's receivable and its installments (Django's post_save signal). */
export async function createEnrollmentAccount(
  tx: Tx,
  e: { id: number; studentId: number; enrolledAt: string; dueDay: number; description: string; schoolYear: number; selfFinancial: boolean },
  values: ContractValues,
) {
  const [payer] = e.selfFinancial ? [] : await financialGuardians(tx, e.studentId).limit(1);
  const [{ id: accountId }] = await tx
    .insert(account)
    .values({
      direction: Direction.RECEIVABLE,
      description: `Contrato ${e.description}`.slice(0, 200),
      categoryId: await tuitionCategoryId(tx),
      enrollmentId: e.id,
      studentId: e.studentId,
      // null when the student pays for themselves
      guardianId: payer?.id ?? null,
      issueDate: e.enrolledAt,
      grossValue: toDb(values.gross),
      discountValue: toDb(values.discount),
      notes: "",
    })
    .returning({ id: account.id });
  await tx.insert(installment).values(
    enrollmentInstallments(values, e.enrolledAt, e.schoolYear, e.dueDay).map((i) => ({
      accountId,
      number: i.number,
      dueDate: i.dueDate,
      amount: toDb(i.amount),
      status: initialStatus(i.amount),
    })),
  );
  return accountId;
}

/** Ending an enrollment early cancels its OPEN installments due today or later (partially paid ones stay). */
export async function cancelFutureInstallments(tx: Tx, enrollmentId: number, on = today()) {
  const [acc] = await tx.select({ id: account.id }).from(account).where(eq(account.enrollmentId, enrollmentId));
  if (!acc) return;
  await tx
    .update(installment)
    .set({ status: InstallmentStatus.CANCELLED })
    .where(and(eq(installment.accountId, acc.id), eq(installment.status, InstallmentStatus.OPEN), gte(installment.dueDate, on)));
}

/** Enrollment.sync_documents(): one checklist row per required document type the enrollment lacks. */
export async function syncDocuments(conn: Conn, enrollmentId: number) {
  const existing = conn.select({ id: enrollmentDocument.typeId }).from(enrollmentDocument).where(eq(enrollmentDocument.enrollmentId, enrollmentId));
  const missing = await conn.select({ id: documentType.id }).from(documentType).where(notInArray(documentType.id, existing));
  if (missing.length) await conn.insert(enrollmentDocument).values(missing.map((t) => ({ enrollmentId, typeId: t.id, isDelivered: false }))).onConflictDoNothing();
}

