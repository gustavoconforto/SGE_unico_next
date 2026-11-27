import { expect, test } from "vitest";
import {
  SHIFT_PERIODS,
  attendanceDeclaration,
  attendanceFields,
  brlAmount,
  examRequestText,
  guardianVisitText,
  fullAddress,
  hourLabel,
  longDate,
  midYearRecess,
  reportGrade,
  schoolingDeclaration,
} from "./enrollment-report";

test("midYearRecess spans the days between the 2nd and 3rd bimesters", () => {
  expect(midYearRecess("2026-06-25", "2026-07-27")).toEqual({ from: "2026-06-26", to: "2026-07-26" });
  expect(midYearRecess(null, "2026-07-27")).toBeNull();
});

test("longDate writes the day without padding and the month in lower case", () => {
  expect(longDate("2026-11-07")).toBe("7 de novembro de 2026");
  expect(longDate("2026-03-15")).toBe("15 de março de 2026");
});

test("reportGrade prefers the class grade level over the contract level", () => {
  expect(reportGrade(2, "1")).toBe("2");
  expect(reportGrade(null, "3")).toBe("3");
  expect(reportGrade(undefined, "1")).toBe("1");
});

test("SHIFT_PERIODS covers the class shifts", () => {
  expect(SHIFT_PERIODS.M).toBe("matutino");
  expect(SHIFT_PERIODS.X).toBeUndefined();
});

test("fullAddress skips blank parts and formats the CEP", () => {
  expect(
    fullAddress({ address: "SQS 106", neighborhood: "Asa Sul", city: "Brasília", state: "DF", zipCode: "70345000" }),
  ).toBe("SQS 106, Asa Sul, Brasília - DF CEP: 70345-000");
  expect(fullAddress({ address: "SQS 106", neighborhood: "", city: "", state: "", zipCode: "" })).toBe("SQS 106");
});

const declaration = {
  name: "João Felipe",
  registration: "202412203",
  birthDate: "2008-11-01",
  parents: ["Cláudio Condi", "Angélica Condi"],
  placeOfBirth: "Brasília-DF",
  address: "SQSW 300 BLOCO C, SETOR SUDOESTE, Brasília - DF CEP: 70673-026",
  shift: "matutino",
  grade: "3",
  program: "Ensino Médio",
  yearEnds: "2026-12-07",
};
const text = (p: { text: string }[]) => p.map((r) => r.text).join("");

test("schoolingDeclaration writes the student's data with the name in bold", () => {
  const [first, ...rest] = schoolingDeclaration(declaration);
  expect(first[1]).toEqual({ text: "JOÃO FELIPE", bold: true });
  expect(text(first)).toBe(
    "Declaramos para os devidos fins que o(a) aluno(a) JOÃO FELIPE, registrada(o) sob o número de matrícula: 202412203, " +
      "nascido(a) dia 01/11/2008, filho(a) CLÁUDIO CONDI e ANGÉLICA CONDI, natural de Brasília-DF, residente à " +
      "SQSW 300 BLOCO C, SETOR SUDOESTE, Brasília - DF CEP: 70673-026, está regularmente matriculado(a) nesta " +
      "Instituição de Ensino no turno matutino, na 3ª Série do Ensino Médio.",
  );
  expect(rest).toHaveLength(2);
  expect(text(rest[0])).toContain("a partir do dia 7 de dezembro de 2026");
});

test("schoolingDeclaration drops blank clauses and the conclusion before the 3ª série", () => {
  const paragraphs = schoolingDeclaration({
    ...declaration,
    grade: "2",
    birthDate: null,
    parents: ["Angélica Condi"],
    placeOfBirth: "",
    shift: undefined,
  });
  expect(paragraphs).toHaveLength(1);
  expect(text(paragraphs[0])).toBe(
    "Declaramos para os devidos fins que o(a) aluno(a) JOÃO FELIPE, registrada(o) sob o número de matrícula: 202412203, " +
      "filho(a) ANGÉLICA CONDI, residente à SQSW 300 BLOCO C, SETOR SUDOESTE, Brasília - DF CEP: 70673-026, " +
      "está regularmente matriculado(a) nesta Instituição de Ensino, na 2ª Série do Ensino Médio.",
  );
});

const query = (q: Record<string, string>) => (key: string) => q[key] ?? null;
const defaults = { date: "2026-11-25", shift: "M" };

test("attendanceFields defaults the event, date and shift until the form is sent", () => {
  expect(attendanceFields(query({}), defaults)).toEqual({
    event: "aplicação da prova",
    date: "2026-11-25",
    shift: "M",
    from: "",
    to: "",
  });
  expect(
    attendanceFields(query({ evento: " simulado ", data: "", turno: "", das: "08:00", as: "12:30" }), defaults),
  ).toEqual({ event: "simulado", date: "", shift: "", from: "08:00", to: "12:30" });
});

test("attendanceFields blanks invalid values", () => {
  expect(
    attendanceFields(query({ evento: "x", data: "25/11/2026", turno: "Z", das: "25:00", as: "8h" }), defaults),
  ).toEqual({ event: "x", date: "", shift: "", from: "", to: "" });
});

test("hourLabel drops zero minutes and the leading zero", () => {
  expect(hourLabel("08:00")).toBe("8h");
  expect(hourLabel("14:30")).toBe("14h30");
});

const student = { ...declaration, shift: "matutino" };

test("attendanceDeclaration writes the student's data and the attendance", () => {
  const [first, second] = attendanceDeclaration(student, {
    event: "aplicação da prova",
    date: "2026-11-12",
    shift: "T",
    from: "14:00",
    to: "17:30",
  });
  expect(first[1]).toEqual({ text: "JOÃO FELIPE", bold: true });
  expect(text(first)).toBe(
    "Declaramos para os devidos fins que o(a) aluno(a) JOÃO FELIPE, Matrícula: 202412203, nascido(a) em 01/11/2008, " +
      "filho(a) de CLÁUDIO CONDI e ANGÉLICA CONDI, natural de Brasília-DF, residente em SQSW 300 BLOCO C, SETOR SUDOESTE, " +
      "Brasília - DF CEP: 70673-026, está regularmente matriculado(a) nesta Instituição de Ensino na 3ª Série, no turno MATUTINO.",
  );
  expect(text(second)).toBe(
    "Declaro ainda, que o(a) aluno(a) esteve presente na aplicação da prova no dia 12/11/2026 no turno VESPERTINO, das 14h às 17h30.",
  );
});

test("attendanceDeclaration prints blank fields as lines to fill by hand", () => {
  const [, second] = attendanceDeclaration(
    { ...student, shift: undefined },
    { event: "", date: "", shift: "", from: "", to: "" },
  );
  expect(text(second)).toBe(
    `Declaro ainda, que o(a) aluno(a) esteve presente na ${"_".repeat(24)} no dia ____/____/________ ` +
      `no turno ${"_".repeat(16)}, das ______h às ______h.`,
  );
});

test("brlAmount reads the fee as typed in Brazil", () => {
  expect(brlAmount("150")).toBe("R$ 150,00");
  expect(brlAmount("1.234,5")).toBe("R$ 1.234,50");
  expect(brlAmount("R$ 80,00")).toBe("R$ 80,00");
  expect(brlAmount("1234")).toBe("R$ 1.234,00");
  expect(brlAmount("")).toBe("");
  expect(brlAmount("12.5")).toBe("");
  expect(brlAmount("abc")).toBe("");
});

test("examRequestText prints the blanks, or lines while they're empty", () => {
  expect(
    examRequestText({
      missedOn: "2026-11-10",
      kind: "PS",
      subject: "Física",
      date: "2026-11-30",
      time: "14:00",
      value: "50",
    }),
  ).toEqual({ missedOn: "10/11/2026", exam: "PS de Física", date: "30/11/2026", time: "14h", value: "R$ 50,00" });
  const blank = examRequestText({ missedOn: "", kind: "PB", subject: "", date: "", time: "", value: "" });
  expect(blank.missedOn).toBe("____/____/________");
  expect(blank.exam).toMatch(/^_+$/);
  expect(blank.time).toMatch(/^_+$/);
  expect(blank.value).toMatch(/^_+$/);
});

test("guardianVisitText prints the blanks, or lines while they're empty", () => {
  expect(
    guardianVisitText({
      name: "Ana Souza",
      rg: "3273373",
      issuer: "SPTC/GO",
      cpf: "796.515.931-72",
      date: "2026-11-26",
      shift: "M",
    }),
  ).toEqual({
    name: "ANA SOUZA",
    rg: "3273373 SPTC/GO",
    cpf: "796.515.931-72",
    date: "26/11/2026",
    shift: "matutino",
  });
  expect(guardianVisitText({ name: " ", rg: "", issuer: "", cpf: "", date: "", shift: "" })).toEqual({
    name: "_".repeat(40),
    rg: `${"_".repeat(12)} ${"_".repeat(8)}`,
    cpf: "_".repeat(18),
    date: "____/____/________",
    shift: "_".repeat(16),
  });
});
