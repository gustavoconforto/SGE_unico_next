// Pure pieces of Django's enrollment printouts (enrollments/views.py build_report_context).
import { formatZipCode } from "./format";

/** Class shift as written in the requerimento ("no período matutino"). */
export const SHIFT_PERIODS: Record<string, string> = { M: "matutino", T: "vespertino", N: "noturno", I: "integral" };

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11-07" → "7 de novembro de 2026" (Django's `j \d\e F \d\e Y|lower`). */
export function longDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

/** Series printed as "{grade}ª Série": the class's grade level, else the contract's level. */
export const reportGrade = (classGradeLevel: number | null | undefined, level: string) => String(classGradeLevel ?? level);

type Address = { address: string; neighborhood: string; city: string; state: string; zipCode: string };

/** The ficha's address line: blank parts are skipped, the CEP is formatted. */
export function fullAddress(p: Address): string {
  let out = p.address;
  if (p.neighborhood) out += `, ${p.neighborhood}`;
  if (p.city) out += `, ${p.city}`;
  if (p.state) out += ` - ${p.state}`;
  if (p.zipCode) out += ` CEP: ${formatZipCode(p.zipCode)}`;
  return out;
}
