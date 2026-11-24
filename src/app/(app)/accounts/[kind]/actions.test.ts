// AccountForm.clean() + AccountReceivableForm.clean() against the dev database (gestao-pg): a receivable takes only
// receivable categories and the student's financial guardians, and with no guardian picked it charges the first one.
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsAccounttype as accountType,
  accountsInstallment as installment,
  studentsGuardian as guardian,
  studentsGuardianassociation as link,
  studentsStudent as student,
} from "@/db/schema/app";
import { createAccount } from "./actions";

vi.mock("@/lib/authorization", () => ({
  requirePermission: async () => ({ user: { role: "admin" } }),
  hasPermission: async () => true,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
const unique = String(Date.now());

const person = (n: number) => ({
  name: `Test ${n}`,
  sex: "F",
  cpf: `${unique}${n}`.slice(-11),
  rg: `t${n}${unique}`,
  issuingAuthority: "",
  nationality: "",
  placeOfBirth: "",
  phone: "",
  mobile: "",
  email: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
});

describe.skipIf(!local)("createAccount payer rules", () => {
  let receivableCategory: number;
  let payableCategory: number;
  let studentId: number;
  let financialId: number;
  let otherId: number;

  const form = (fields: Record<string, string>) => {
    const f = new FormData();
    const all = {
      description: "test account",
      categoryId: String(receivableCategory),
      issueDate: "2030-01-01",
      studentId: String(studentId),
      grossValue: "300,00",
      installmentsCount: "3",
      firstDueDate: "2030-01-10",
      ...fields,
    };
    for (const [k, v] of Object.entries(all)) f.set(k, v);
    return f;
  };
  const create = (fields: Record<string, string> = {}) =>
    createAccount("receivable", {}, form(fields)).catch((e: Error) => e.message);

  beforeAll(async () => {
    [{ id: receivableCategory }, { id: payableCategory }] = await db
      .insert(accountType)
      .values([
        { name: `test-r-${unique}`, direction: "R" },
        { name: `test-p-${unique}`, direction: "P" },
      ])
      .returning({ id: accountType.id });
    [{ id: studentId }] = await db
      .insert(student)
      .values({
        ...person(1),
        socialName: "",
        useSocialName: false,
        registration: `t${unique}`,
        photo: "",
        isSelfFinancial: false,
        bloodType: "O+",
        observations: "",
        schoolFrom: "",
      })
      .returning({ id: student.id });
    [{ id: financialId }, { id: otherId }] = await db
      .insert(guardian)
      .values([
        { ...person(2), maritalStatus: "" },
        { ...person(3), maritalStatus: "" },
      ])
      .returning({ id: guardian.id });
    const flags = { relationship: "MAE", isPrimaryContact: false, livingWith: false, pickUp: false, studentId };
    await db.insert(link).values([
      { ...flags, guardianId: financialId, isFinancial: true },
      { ...flags, guardianId: otherId, isFinancial: false },
    ]);
  });

  // Everything on the test's own rows, even an account a failing assertion let through; skips what setup never made
  afterAll(async () => {
    const categories = [receivableCategory, payableCategory].filter((id) => id !== undefined);
    if (categories.length) {
      const accounts = db.select({ id: account.id }).from(account).where(inArray(account.categoryId, categories));
      await db.delete(installment).where(inArray(installment.accountId, accounts));
      await db.delete(account).where(inArray(account.categoryId, categories));
    }
    if (studentId !== undefined) await db.delete(link).where(eq(link.studentId, studentId));
    const guardians = [financialId, otherId].filter((id) => id !== undefined);
    if (guardians.length) await db.delete(guardian).where(inArray(guardian.id, guardians));
    if (studentId !== undefined) await db.delete(student).where(eq(student.id, studentId));
    if (categories.length) await db.delete(accountType).where(inArray(accountType.id, categories));
  });

  it("refuses a payable category and a guardian who isn't financial", async () => {
    expect(await create({ categoryId: String(payableCategory) })).toMatchObject({
      errors: { categoryId: [expect.any(String)] },
    });
    expect(await create({ guardianId: String(otherId) })).toMatchObject({
      errors: { guardianId: [expect.any(String)] },
    });
  });

  it("charges the student's financial guardian when none is picked", async () => {
    const result = await create();
    const id = Number(/\/accounts\/receivable\/(\d+)\/edit/.exec(String(result))?.[1]);
    expect(id).toBeGreaterThan(0);
    const [acc] = await db
      .select({ guardianId: account.guardianId, studentId: account.studentId })
      .from(account)
      .where(eq(account.id, id));
    expect(acc).toEqual({ guardianId: financialId, studentId });
    expect(await db.select({ id: installment.id }).from(installment).where(eq(installment.accountId, id))).toHaveLength(
      3,
    );
  });
});
