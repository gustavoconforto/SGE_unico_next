import { describe, expect, it } from "vitest";
import { formatPhone, personFields, phoneDigits, whatsapp } from "./person";
import { type GuardianRow, ageOn, displayName, guardianRowsError, nextRegistration } from "./students";

const row = (guardianId: number, isFinancial = false, del = false): GuardianRow => ({
  id: null,
  guardianId,
  relationship: "MAE",
  isFinancial,
  isPrimaryContact: false,
  livingWith: false,
  pickUp: false,
  delete: del,
});

describe("guardianRowsError (from students/tests.py FinancialGuardianTests)", () => {
  it("rejects two financial guardians", () => {
    expect(guardianRowsError([row(1, true), row(2, true)], false)).toMatch("Apenas um responsável pode ser");
  });
  it("rejects a financial guardian when the student is self financial", () => {
    expect(guardianRowsError([row(1, true)], true)).toMatch("próprio responsável financeiro");
  });
  it("requires a guardian, then a financial payer", () => {
    expect(guardianRowsError([], false)).toMatch("Escolha o responsável do aluno");
    expect(guardianRowsError([row(1)], false)).toMatch("Marque um responsável financeiro");
  });
  it("accepts a self-financial student or exactly one financial guardian", () => {
    expect(guardianRowsError([], true)).toBeUndefined();
    expect(guardianRowsError([row(1, true), row(2)], false)).toBeUndefined();
  });
  it("ignores rows marked for deletion and rejects duplicates", () => {
    expect(guardianRowsError([row(1, true), row(2, true, true)], false)).toBeUndefined();
    expect(guardianRowsError([row(1, true), row(1)], false)).toMatch("mais de uma vez");
  });
});

describe("nextRegistration (Student._next_registration)", () => {
  it("continues the year's sequence or starts at 00001", () => {
    expect(nextRegistration("202600055", 2026)).toBe("202600056");
    expect(nextRegistration(null, 2026)).toBe("202600001");
    expect(nextRegistration("202500999", 2026)).toBe("202600001");
  });
});

describe("phones (PhoneDigitsTests, WhatsAppLinkTests)", () => {
  it("formats stored digits", () => {
    expect(formatPhone("61998544554")).toBe("(61) 99854-4554");
    expect(formatPhone("6132345678")).toBe("(61) 3234-5678");
    expect(formatPhone("(61) 9985")).toBe("(61) 9985");
    expect(formatPhone(null)).toBe("");
  });
  it("stores masked input as digits and rejects numbers without DDD", () => {
    expect(phoneDigits.parse("(61) 99854-4554")).toBe("61998544554");
    expect(phoneDigits.safeParse("99854-4554").error?.issues[0].message).toMatch("Informe DDD + número");
    expect(phoneDigits.parse("")).toBe("");
  });
  it("builds WhatsApp numbers", () => {
    expect(whatsapp("(61) 91234-5678")).toBe("5561912345678");
    expect(whatsapp("(61) 3234-5678")).toBe("556132345678");
    expect(whatsapp("+55 61 91234-5678")).toBe("5561912345678");
    expect(whatsapp("91234-5678")).toBe("");
    expect(whatsapp(null)).toBe("");
  });
});

describe("personFields.cpf", () => {
  it("accepts a pasted formatted CPF and stores digits", () => {
    expect(personFields.cpf.parse("123.456.789-00")).toBe("12345678900");
  });
  it("rejects a short or empty CPF", () => {
    expect(personFields.cpf.safeParse("123.456").success).toBe(false);
    expect(personFields.cpf.safeParse("").success).toBe(false);
  });
});

describe("displayName", () => {
  it("uses the social name only when the student chose it and filled it", () => {
    expect(displayName({ name: "João", socialName: "Joana", useSocialName: true })).toBe("Joana");
    expect(displayName({ name: "João", socialName: "Joana", useSocialName: false })).toBe("João");
    expect(displayName({ name: "João", socialName: "", useSocialName: true })).toBe("João");
  });
});

describe("ageOn", () => {
  it("counts a year only once the birthday has come", () => {
    expect(ageOn("2010-11-19", "2026-11-19")).toBe(16);
    expect(ageOn("2010-11-20", "2026-11-19")).toBe(15);
    expect(ageOn("2010-12-01", "2026-11-19")).toBe(15);
    expect(ageOn("2010-02-28", "2026-03-01")).toBe(16);
  });
});
