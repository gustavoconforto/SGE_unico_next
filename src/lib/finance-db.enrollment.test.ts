// Enrollment money writes against the dev database (gestao-pg), inside one transaction that is rolled back:
// the contract's installments add up to its net value, the documents checklist doesn't duplicate, and ending
// the enrollment cancels only OPEN installments due from that day on.
import "dotenv/config";
import { TransactionRollbackError, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsInstallment as installment,
  accountsPayment as payment,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmentneededdocument as enrollmentDocument,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsNeededdocumenttype as documentType,
  enrollmentsSchoolyear as year,
  programsProgram as program,
  studentsStudent as student,
} from "@/db/schema/app";
import { contractValues, money } from "./finance";
import { cancelFutureInstallments, createEnrollmentAccount, syncDocuments } from "./finance-db";

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
const unique = String(Date.now());

describe.skipIf(!local)("enrollment account", () => {
  it("creates the contract, syncs documents once, and ending it cancels only future open installments", async () => {
    await db
      .transaction(async (tx) => {
        const [p] = await tx.insert(program).values({ name: `test-${unique}` }).returning();
        const [y] = await tx.insert(year).values({ begins: "2030-02-04", ends: "2030-12-13" }).returning();
        const [type] = await tx
          .insert(enrollmentType)
          .values({ level: "1", programId: p.id, schoolYearId: y.id, startDate: y.begins, endDate: y.ends, totalPrice: "1200.00", punctualityDiscount: "0.00", description: "test" })
          .returning();
        const [s] = await tx
          .insert(student)
          .values({
            name: "Test Student", sex: "F", cpf: unique.slice(-11), rg: `t${unique}`, issuingAuthority: "", nationality: "", placeOfBirth: "", phone: "", mobile: "",
            email: "", address: "", neighborhood: "", city: "", state: "", zipCode: "", socialName: "", useSocialName: false, registration: `t${unique}`, photo: "",
            isSelfFinancial: true, bloodType: "O+", observations: "", schoolFrom: "",
          })
          .returning();
        // Enrolled ahead of the school year: 12 installments, January to December
        const enrolledAt = "2029-12-01";
        const [e] = await tx
          .insert(enrollment)
          .values({ studentId: s.id, enrollmentTypeId: type.id, status: "A", dueDay: 10, enrolledAt, grossValue: "1200.00", firstDiscountPercent: "0.00", remainingDiscountPercent: "10.00" })
          .returning();
        const values = contractValues("1200.00", "0", "10");
        const accountId = await createEnrollmentAccount(tx, { id: e.id, studentId: s.id, enrolledAt, dueDay: 10, schoolYear: 2030, selfFinancial: true, description: "test" }, values);

        const [acc] = await tx.select().from(account).where(eq(account.id, accountId));
        expect(acc).toMatchObject({ enrollmentId: e.id, guardianId: null, grossValue: "1200.00", discountValue: "110.00" });
        const rows = await tx.select().from(installment).where(eq(installment.accountId, accountId)).orderBy(installment.number);
        expect(rows).toHaveLength(12);
        expect(rows.reduce((sum, i) => sum.plus(money(i.amount)), money(0)).toFixed(2)).toBe(values.net.toFixed(2));
        expect(rows.every((i) => i.status === "A" && i.dueDate.startsWith("2030-"))).toBe(true);

        // Run twice, like an edit after a new document type: no duplicate checklist rows
        await syncDocuments(tx, e.id);
        await syncDocuments(tx, e.id);
        const docs = await tx.select().from(enrollmentDocument).where(eq(enrollmentDocument.enrollmentId, e.id));
        expect(docs).toHaveLength((await tx.select({ id: documentType.id }).from(documentType)).length);

        // March is partly paid; dropping out on March 1st keeps January, February and the partial one
        await tx.insert(payment).values({ installmentId: rows[2].id, paidAt: "2030-03-01", amount: "10.00", penalty: "0.00", interest: "0.00", monetaryAdjust: "0.00", discount: "0.00", method: "PIX", notes: "" });
        await tx.update(installment).set({ status: "P" }).where(eq(installment.id, rows[2].id));
        await cancelFutureInstallments(tx, e.id, "2030-03-01");
        const after = await tx.select({ status: installment.status }).from(installment).where(eq(installment.accountId, accountId)).orderBy(installment.number);
        expect(after.map((i) => i.status)).toEqual(["A", "A", "P", ...Array(9).fill("C")]);

        tx.rollback();
      })
      .catch((error) => {
        if (!(error instanceof TransactionRollbackError)) throw error;
      });
  });
});
