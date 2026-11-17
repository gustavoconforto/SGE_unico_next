import { and, asc, eq, inArray } from "drizzle-orm";
import { getEnrollment } from "@/app/(app)/enrollments/data";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsInstallment as installment,
  classesClass as klass,
  enrollmentsEnrollmentneededdocument as enrollmentDocument,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsNeededdocumenttype as documentType,
  studentsGuardian as guardian,
  studentsGuardianassociation as guardianLink,
  studentsStudent as student,
} from "@/db/schema/app";
import { reportGrade } from "@/lib/enrollment-report";
import { contractValues } from "@/lib/finance";
import { financialGuardians } from "@/lib/finance-db";

export type Person = typeof guardian.$inferSelect | typeof student.$inferSelect;

/** Django's build_report_context: everything the contract, requerimento and ficha print. */
export async function loadEnrollmentReport(id: number) {
  const row = await getEnrollment(id);
  if (!row) return null;
  const e = row.e;
  const [[pupil], [type], [cls], links, documents, installments] = await Promise.all([
    db.select().from(student).where(eq(student.id, e.studentId)),
    db.select({ startDate: enrollmentType.startDate, endDate: enrollmentType.endDate }).from(enrollmentType).where(eq(enrollmentType.id, e.enrollmentTypeId)),
    e.schoolClassId ? db.select().from(klass).where(eq(klass.id, e.schoolClassId)) : Promise.resolve([]),
    db
      .select({ relationship: guardianLink.relationship, person: guardian })
      .from(guardianLink)
      .innerJoin(guardian, eq(guardianLink.guardianId, guardian.id))
      .where(and(eq(guardianLink.studentId, e.studentId), inArray(guardianLink.relationship, ["PAI", "MAE"])))
      .orderBy(asc(guardianLink.id)),
    db
      .select({ type: documentType.description, isDelivered: enrollmentDocument.isDelivered })
      .from(enrollmentDocument)
      .innerJoin(documentType, eq(enrollmentDocument.typeId, documentType.id))
      .where(eq(enrollmentDocument.enrollmentId, id))
      .orderBy(asc(documentType.description)),
    // The installments actually billed, not a 1/12 estimate
    db
      .select({ id: installment.id, number: installment.number, dueDate: installment.dueDate, amount: installment.amount })
      .from(installment)
      .innerJoin(account, eq(installment.accountId, account.id))
      .where(eq(account.enrollmentId, id))
      .orderBy(asc(installment.number)),
  ]);

  // Django's Student.financial_payer: the student, or the first financial guardian
  let payer: Person | null = pupil.isSelfFinancial ? pupil : null;
  if (!payer) {
    const [first] = await financialGuardians(db, e.studentId).limit(1);
    if (first) [payer] = await db.select().from(guardian).where(eq(guardian.id, first.id));
  }
  // A dict keyed by relationship in Django: the last link wins
  const parent = (code: string) => links.findLast((l) => l.relationship === code)?.person ?? null;
  const values = e.grossValue ? contractValues(e.grossValue, e.firstDiscountPercent ?? 0, e.remainingDiscountPercent ?? 0) : null;

  return {
    enrollment: e,
    student: pupil,
    program: row.program,
    level: row.level,
    schoolYear: row.schoolYear,
    grade: reportGrade(cls?.gradeLevel, row.level),
    schoolClass: cls ?? null,
    startDate: type.startDate,
    endDate: type.endDate,
    payer,
    father: parent("PAI"),
    mother: parent("MAE"),
    delivered: documents.filter((d) => d.isDelivered).map((d) => d.type),
    pending: documents.filter((d) => !d.isDelivered).map((d) => d.type),
    installments,
    discountPercent: values?.overallDiscountPercent ?? null,
    discountAmount: values?.discount ?? null,
  };
}

export type EnrollmentReport = NonNullable<Awaited<ReturnType<typeof loadEnrollmentReport>>>;
