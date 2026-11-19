// Port of django/gestao/utils/format/*.py
import Decimal from "decimal.js";

export function formatCpf(cpf: string): string {
  if (cpf.length !== 11) throw new TypeError("CPF must have 11 digits");
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** Masks a CPF as it's typed or pasted: "12345678" → "123.456.78", any punctuation in → "000.000.000-00" out. */
export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  const head = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(".");
  return d.length > 9 ? `${head}-${d.slice(9)}` : head;
}

/** Phone typed so far as (61) 3234-5678 or (61) 99854-4554 (the ninth digit moves the dash). */
export function maskPhone(value: string): string {
  const all = value.replace(/\D/g, "");
  // A pasted +55 number: drop the country code, the field holds DDD + number
  const d = (all.length > 11 && all.startsWith("55") ? all.slice(2) : all).slice(0, 11);
  if (d.length <= 2) return d && `(${d}`;
  const split = d.length === 11 ? 7 : 6;
  return d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
}

/** CEP typed so far as 70000-000. */
export function maskZipCode(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
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

/** Login suggested from a person's name: "Maria da Conceição Silva" → "maria.silva" (first and last name, no accents). */
export function suggestUsername(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  const parts = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return parts.join(".").slice(0, 30);
}
