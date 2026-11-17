// Port of django/gestao/utils/format/*.py
import Decimal from "decimal.js";

export function formatCpf(cpf: string): string {
  if (cpf.length !== 11) throw new TypeError("CPF must have 11 digits");
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function formatZipCode(zipCode: string): string {
  return `${zipCode.slice(0, -3)}-${zipCode.slice(-3)}`;
}

const UNITS = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const TENS = ["_", "_", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = [
  "_", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function belowThousand(n: number): string {
  if (n === 100) return "cem";
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(HUNDREDS[Math.floor(n / 100)]);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }
  if (n) parts.push(UNITS[n]);
  return parts.join(" e ");
}

function integerInWords(n: number): string {
  if (n === 0) return "zero";
  // shortcut: stops at billions, fine for receipts.
  const scales: [number, string, string][] = [
    [1e9, "bilhão", "bilhões"],
    [1e6, "milhão", "milhões"],
    [1000, "mil", "mil"],
  ];
  const groups: [number, string][] = [];
  for (const [value, singular, plural] of scales) {
    const count = Math.floor(n / value);
    n %= value;
    if (count) {
      const name = count === 1 ? singular : plural;
      groups.push([count, value === 1000 && count === 1 ? name : `${belowThousand(count)} ${name}`]);
    }
  }
  if (n) groups.push([n, belowThousand(n)]);
  const texts = groups.map(([, text]) => text);
  // "e" joins the last group when its count is below 100 or a round hundred.
  const lastCount = groups[groups.length - 1][0];
  if (groups.length > 1 && (lastCount < 100 || lastCount % 100 === 0)) {
    return `${texts.slice(0, -1).join(" ")} e ${texts[texts.length - 1]}`;
  }
  return texts.join(" ");
}

/** Brazilian currency in words: "7530.16" -> "sete mil quinhentos e trinta reais e dezesseis centavos". */
export function amountInWords(value: Decimal.Value): string {
  const centsTotal = new Decimal(value).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
  const reais = Math.floor(centsTotal / 100);
  const cents = centsTotal % 100;
  const parts: string[] = [];
  if (reais) {
    // "um milhão de reais", "dois milhões de reais"
    const suffix = reais % 1e6 === 0 ? " de reais" : reais === 1 ? " real" : " reais";
    parts.push(integerInWords(reais) + suffix);
  }
  if (cents) parts.push(integerInWords(cents) + (cents === 1 ? " centavo" : " centavos"));
  return parts.join(" e ") || "zero reais";
}

/** Stored CPF (11 digits) or CNPJ (14 digits) with punctuation; anything else as is. */
export function formatDocument(value: string | null | undefined): string {
  const v = value ?? "";
  if (/^\d{11}$/.test(v)) return formatCpf(v);
  if (/^\d{14}$/.test(v)) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
  return v;
}

/** "Pessoa física" for a CPF, "Pessoa jurídica" for a CNPJ. */
export const personKind = (value: string | null | undefined) => ({ 11: "Pessoa física", 14: "Pessoa jurídica" })[(value ?? "").length] ?? "";
