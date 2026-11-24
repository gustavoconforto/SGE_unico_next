// Shared fields of base.models.Person (Employee, Guardian, Student) and the phone helpers
// from base/templatetags/ui.py + students/forms.py PhoneDigitsMixin.
import { z } from "zod";
import { REQUIRED, maxLen, optionalText, requiredText } from "./form";
import { UNIQUE_VIOLATION, pgConstraint, pgErrorCode } from "./db-error";

export const SEX_CHOICES = [
  ["M", "Masculino"],
  ["F", "Feminino"],
] as const;

/** Stored phone digits as (61) 99854-4554 / (61) 3234-5678; anything else as is. */
export function formatPhone(value: string | null | undefined): string {
  const v = value ?? "";
  return /^\d{10,11}$/.test(v) ? `(${v.slice(0, 2)}) ${v.slice(2, -4)}-${v.slice(-4)}` : v;
}

/** Brazilian phone as WhatsApp digits (55 + DDD + number); "" if it isn't one. */
export function whatsapp(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return "";
}

/** Phone typed with a mask, stored as digits (DDD + number). */
export const phoneDigits = z
  .string()
  .default("")
  .transform((v) => v.replace(/\D/g, ""))
  .refine((d) => d === "" || d.length === 10 || d.length === 11, "Informe DDD + número (10 ou 11 dígitos).");

const digitsOnly = (v: string) => v.replace(/\D/g, "");

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
].map((uf) => [uf, uf] as const);

export const personFields = {
  name: requiredText(200),
  sex: z.enum(["M", "F", ""]).default(""),
  // Accepts a pasted "123.456.789-00"
  cpf: z
    .string()
    .trim()
    .transform(digitsOnly)
    .pipe(
      z
        .string()
        .min(1, REQUIRED)
        .regex(/^\d{11}$/, "O CPF deve ter 11 dígitos."),
    ),
  rg: requiredText(20),
  issuingAuthority: requiredText(20),
  birthDate: z
    .string()
    .default("")
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Informe uma data válida.")
    .transform((v) => v || null),
  nationality: optionalText(50),
  placeOfBirth: optionalText(50),
  // Employees keep phones as typed (Django has no PhoneDigitsMixin there)
  phone: optionalText(20),
  mobile: optionalText(20),
  email: z.union([z.literal(""), z.email("Informe um endereço de email válido.").max(254, maxLen(254))]).default(""),
  address: optionalText(200),
  neighborhood: optionalText(100),
  city: optionalText(100),
  state: optionalText(2),
  zipCode: z
    .string()
    .default("")
    .transform(digitsOnly)
    .refine((v) => v === "" || v.length === 8, "O CEP deve ter 8 dígitos."),
};

const UNIQUE_FIELDS: [suffix: string, field: string, message: string][] = [
  ["_cpf_key", "cpf", "Já existe um cadastro com este CPF."],
  ["_unique_cpf", "cpf", "Já existe um cadastro com este CPF."],
  ["_rg_key", "rg", "Já existe um cadastro com este RG."],
];

/** Maps a CPF/RG unique violation to a field error; undefined for any other error. */
export function personUniqueError(error: unknown): Record<string, string[]> | undefined {
  if (pgErrorCode(error) !== UNIQUE_VIOLATION) return undefined;
  const constraint = pgConstraint(error);
  const hit = UNIQUE_FIELDS.find(([suffix]) => constraint.endsWith(suffix));
  return hit ? { [hit[1]]: [hit[2]] } : undefined;
}
