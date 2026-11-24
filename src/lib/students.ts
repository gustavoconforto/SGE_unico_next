// Port of students/models.py choices and the rules in Student.save / BaseGuardianFormSet.clean.
import { z } from "zod";
import { REQUIRED } from "./form";

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => [t, t] as const);

export const MARITAL_STATUS = [
  ["S", "Solteiro(a)"],
  ["C", "Casado(a)"],
  ["U", "União estável"],
  ["D", "Divorciado(a)"],
  ["V", "Viúvo(a)"],
] as const;

export const RELATIONSHIPS = [
  ["PAI", "Pai"],
  ["MAE", "Mãe"],
  ["AVO", "Avô/Avó"],
  ["TIO", "Tio(a)"],
  ["IRM", "Irmão(ã)"],
  ["PAD", "Padrasto/Madrasta"],
  ["TUT", "Tutor(a) legal"],
  ["OUT", "Outro"],
] as const;

/** Next registration of the year: "<year><5-digit sequence>", e.g. 202600056. */
export function nextRegistration(last: string | null | undefined, year: number): string {
  const prefix = String(year);
  const seq = last && new RegExp(`^${prefix}\\d{5}$`).test(last) ? Number(last.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

export const guardianRowSchema = z.object({
  id: z.number().int().positive().nullable(), // GuardianAssociation pk; null for a new row
  guardianId: z.number({ error: REQUIRED }).int().positive(REQUIRED),
  relationship: z.enum(RELATIONSHIPS.map(([code]) => code) as [string, ...string[]], { error: REQUIRED }),
  isFinancial: z.boolean(),
  isPrimaryContact: z.boolean(),
  livingWith: z.boolean(),
  pickUp: z.boolean(),
  delete: z.boolean(),
});
export type GuardianRow = z.infer<typeof guardianRowSchema>;

/** The formset-level rules; returns the Portuguese error or undefined. */
export function guardianRowsError(rows: GuardianRow[], selfFinancial: boolean): string | undefined {
  const kept = rows.filter((r) => !r.delete);
  const ids = kept.map((r) => r.guardianId);
  if (new Set(ids).size !== ids.length) return "O mesmo responsável aparece mais de uma vez.";
  // No guardian at all: the problem is the missing person, not the missing "financeiro" tick
  if (kept.length === 0 && !selfFinancial)
    return "Escolha o responsável do aluno, ou indique que o próprio aluno é o responsável financeiro.";
  const financial = kept.filter((r) => r.isFinancial).length;
  if (financial > 1) return "Apenas um responsável pode ser o responsável financeiro.";
  if (financial && selfFinancial)
    return "O aluno é o próprio responsável financeiro; desmarque o responsável financeiro na lista ou desmarque essa opção.";
  if (!financial && !selfFinancial)
    return "Marque um responsável financeiro ou indique que o próprio aluno é o responsável financeiro.";
  return undefined;
}

/** Shown when a student has no photo (served from public/). */
export const STUDENT_PLACEHOLDER = "/img/student-placeholder.svg";

/** Whole years between an ISO birth date and an ISO day ("2010-11-17", "2026-11-19" → 16). */
export function ageOn(birthDate: string, day: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = day.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** The name a student goes by: the social name when they chose to use it (the SQL twin is `studentName` in enrollments/data.ts). */
export function displayName(s: { name: string; socialName: string; useSocialName: boolean }): string {
  return s.useSocialName && s.socialName ? s.socialName : s.name;
}
