import { expect, test } from "vitest";
import { SHIFT_PERIODS, fullAddress, longDate, reportGrade, schoolingDeclaration } from "./enrollment-report";

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
