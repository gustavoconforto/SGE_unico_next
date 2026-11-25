// Pure pieces of Django's enrollment printouts (enrollments/views.py build_report_context).
import { formatZipCode } from "./format";

/** Class shift as written in the requerimento ("no período matutino"). */
export const SHIFT_PERIODS: Record<string, string> = { M: "matutino", T: "vespertino", N: "noturno", I: "integral" };

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-11-07" → "7 de novembro de 2026" (Django's `j \d\e F \d\e Y|lower`). */
export function longDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

/** Series printed as "{grade}ª Série": the class's grade level, else the contract's level. */
export const reportGrade = (classGradeLevel: number | null | undefined, level: string) =>
  String(classGradeLevel ?? level);

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

/** A stretch of a printout's paragraph; the page and the .docx render the same runs. */
export type Run = { text: string; bold?: boolean };

/**
 * The declaração de escolaridade's paragraphs (not in Django: copied from the secretaria's paper model).
 * Blank data drops its clause; the conclusion paragraphs only apply to the last series (3ª).
 */
export function schoolingDeclaration(d: {
  name: string;
  registration: string;
  birthDate: string | null;
  parents: string[];
  placeOfBirth: string;
  address: string;
  shift: string | undefined;
  grade: string;
  program: string;
  yearEnds: string;
}): Run[][] {
  const facts = [
    `registrada(o) sob o número de matrícula: ${d.registration}`,
    d.birthDate && `nascido(a) dia ${d.birthDate.slice(0, 10).split("-").reverse().join("/")}`,
    d.parents.length > 0 && `filho(a) ${d.parents.map((p) => p.toUpperCase()).join(" e ")}`,
    d.placeOfBirth && `natural de ${d.placeOfBirth}`,
    d.address && `residente à ${d.address}`,
  ].filter(Boolean);
  const paragraphs: Run[][] = [
    [
      { text: "Declaramos para os devidos fins que o(a) aluno(a) " },
      { text: d.name.toUpperCase(), bold: true },
      {
        text: `, ${facts.join(", ")}, está regularmente matriculado(a) nesta Instituição de Ensino${
          d.shift ? ` no turno ${d.shift}` : ""
        }, na ${d.grade}ª Série do ${d.program}.`,
      },
    ],
  ];
  if (d.grade === "3")
    paragraphs.push(
      [
        {
          text: `A declaração de conclusão e histórico escolar oficiais inerentes à conclusão do ensino médio, serão emitidos a partir do dia ${longDate(d.yearEnds)}, data em que o ano letivo será oficialmente finalizado.`,
        },
      ],
      [
        {
          text: "O Certificado de Conclusão do(a) referido(a) aluno(a) será expedido conforme o Regimento Escolar desta Instituição Educacional e Portaria nº 226 de 14 de outubro de 2008 – SEDF, no prazo máximo de 120 (cento e vinte) dias a contar da data de finalização do ano letivo.",
        },
      ],
    );
  return paragraphs;
}
