// Pure pieces of Django's enrollment printouts (enrollments/views.py build_report_context).
import { addDays } from "./dates";
import { formatDate, formatMoney } from "./finance";
import { formatZipCode } from "./format";

/** The blanks typed in the print toolbars: "2026-11-30" and "14:30". */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

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

/** The mid-year recess between the 2nd and 3rd bimesters (the school year has no recess field); null when either date is unset. */
export function midYearRecess(bi2Ends: string | null, bi3Begins: string | null) {
  return bi2Ends && bi3Begins ? { from: addDays(bi2Ends, 1), to: addDays(bi3Begins, -1) } : null;
}

/** A stretch of a printout's paragraph; the page and the .docx render the same runs. */
export type Run = { text: string; bold?: boolean };

/** The student's data the declarações print. */
export type StudentFacts = {
  name: string;
  registration: string;
  birthDate: string | null;
  parents: string[];
  placeOfBirth: string;
  address: string;
  shift: string | undefined;
  grade: string;
};

/**
 * The declaração de escolaridade's paragraphs (not in Django: copied from the secretaria's paper model).
 * Blank data drops its clause; the conclusion paragraphs only apply to the last series (3ª).
 */
export function schoolingDeclaration(d: StudentFacts & { program: string; yearEnds: string }): Run[][] {
  const facts = [
    `registrada(o) sob o número de matrícula: ${d.registration}`,
    d.birthDate && `nascido(a) dia ${formatDate(d.birthDate)}`,
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

/** What the secretaria fills in on the declaração de comparecimento; blank fields print as lines to fill by hand. */
export type Attendance = { event: string; date: string; shift: string; from: string; to: string };

export const DEFAULT_ATTENDANCE_EVENT = "aplicação da prova";

/**
 * Reads the declaração de comparecimento's fields from the query string (`get` returns null for a missing key).
 * Before the form is first submitted the event, date and shift take their defaults; invalid values become blank.
 */
export function attendanceFields(
  get: (key: string) => string | null,
  defaults: { date: string; shift: string | undefined },
): Attendance {
  const value = (key: string, fallback: string, valid: (v: string) => boolean) => {
    const v = get(key)?.trim();
    if (v == null) return fallback;
    return valid(v) ? v : "";
  };
  return {
    event: value("evento", DEFAULT_ATTENDANCE_EVENT, () => true).slice(0, 200),
    date: value("data", defaults.date, (v) => ISO_DATE.test(v)),
    shift: value("turno", defaults.shift ?? "", (v) => v in SHIFT_PERIODS),
    from: value("das", "", (v) => TIME.test(v)),
    to: value("as", "", (v) => TIME.test(v)),
  };
}

/** "08:00" → "8h", "14:30" → "14h30". */
export const hourLabel = (time: string) => {
  const [h, m] = time.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
};

/**
 * The declaração de comparecimento's paragraphs (not in Django: copied from the secretaria's paper model).
 * Blank student data drops its clause; blank attendance fields print as lines, as on the paper model.
 */
export function attendanceDeclaration(d: StudentFacts, a: Attendance): Run[][] {
  const facts = [
    `Matrícula: ${d.registration}`,
    d.birthDate && `nascido(a) em ${formatDate(d.birthDate)}`,
    d.parents.length > 0 && `filho(a) de ${d.parents.map((p) => p.toUpperCase()).join(" e ")}`,
    d.placeOfBirth && `natural de ${d.placeOfBirth}`,
    d.address && `residente em ${d.address}`,
  ].filter(Boolean);
  const blank = (s: string, n: number) => s || "_".repeat(n);
  return [
    [
      { text: "Declaramos para os devidos fins que o(a) aluno(a) " },
      { text: d.name.toUpperCase(), bold: true },
      {
        text: `, ${facts.join(", ")}, está regularmente matriculado(a) nesta Instituição de Ensino na ${d.grade}ª Série${
          d.shift ? `, no turno ${d.shift.toUpperCase()}` : ""
        }.`,
      },
    ],
    [
      {
        text:
          `Declaro ainda, que o(a) aluno(a) esteve presente na ${blank(a.event, 24)} no dia ` +
          `${a.date ? formatDate(a.date) : "____/____/________"} no turno ${blank(SHIFT_PERIODS[a.shift]?.toUpperCase() ?? "", 16)}, ` +
          `das ${a.from ? hourLabel(a.from) : "______h"} às ${a.to ? hourLabel(a.to) : "______h"}.`,
      },
    ],
  ];
}

/** The requerimento de prova substitutiva's exam kinds: substitutiva and bimestral. */
export const EXAM_KINDS = ["PS", "PB"] as const;

/** What the secretaria fills in on the requerimento de prova substitutiva. */
export type ExamRequest = {
  missedOn: string;
  kind: string;
  subject: string;
  date: string;
  time: string;
  value: string;
};

/** "150" or "1.234,5" (as typed in Brazil) → "R$ 150,00" / "R$ 1.234,50"; anything else → "". */
export function brlAmount(typed: string): string {
  const s = typed.trim().replace(/^R\$\s*/, "");
  if (!/^\d{1,3}(\.?\d{3})*(,\d{1,2})?$/.test(s)) return "";
  return `R$ ${formatMoney(s.replaceAll(".", "").replace(",", "."))}`;
}

/**
 * The requerimento de prova substitutiva's blanks as printed (not in Django: copied from the secretaria's paper
 * model). A field left empty prints as a line to fill by hand; the exam reads "PS de Física".
 */
export function examRequestText(v: ExamRequest) {
  const date = (iso: string) => (ISO_DATE.test(iso) ? formatDate(iso) : "____/____/________");
  return {
    missedOn: date(v.missedOn),
    exam: v.kind && v.subject ? `${v.kind} de ${v.subject}` : "_".repeat(40),
    date: date(v.date),
    time: TIME.test(v.time) ? hourLabel(v.time) : "__________",
    value: brlAmount(v.value) || "_".repeat(20),
  };
}
