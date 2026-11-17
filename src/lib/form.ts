// Shared Server Action form plumbing: what a failed submit sends back to the form.
import { z } from "zod";
import { type Money, money } from "./finance";

export type FormErrors = Record<string, string[] | undefined>;
export type FormState = { errors?: FormErrors; formError?: string; values?: Record<string, string> };

export const REQUIRED = "Este campo é obrigatório.";
/** A picked option that was deleted (or never existed) since the form loaded. */
export const INVALID_CHOICE = "Esta opção não está mais disponível. Escolha outra da lista.";
export const maxLen = (n: number) => `Use no máximo ${n} caracteres.`;

/** Required text, trimmed like Django's CharField. */
export const requiredText = (max: number) => z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(max, maxLen(max));
/** Optional text: Django stores blank CharFields as "". */
export const optionalText = (max: number) => z.string().trim().max(max, maxLen(max)).default("");
/** Optional <input type=number>: "" becomes null. */
export const optionalSmallInt = z
  .string()
  .default("")
  .transform((v, ctx) => {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 32767) {
      ctx.addIssue({ code: "custom", message: "Informe um número inteiro válido." });
      return z.NEVER;
    }
    return n;
  });
/** Required foreign key coming from a <select>. */
export const foreignKey = z.coerce.number({ error: REQUIRED }).int(REQUIRED).positive(REQUIRED);
/** Optional foreign key from a <select>: "" becomes null. */
export const optionalForeignKey = z
  .string()
  .default("")
  .transform((v) => (v ? Number(v) : null))
  .refine((v) => v === null || (Number.isSafeInteger(v) && v > 0), "Selecione uma opção válida.");
/** Ids ticked in a group of checkboxes (or a multi-select), deduplicated; anything not a number is dropped. */
export const formIds = (formData: FormData, name: string) => [...new Set(formData.getAll(name).map(Number).filter(Number.isSafeInteger))];
/** HTML checkbox: present means checked. */
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

/** String fields of the submitted form, echoed back so a failed submit keeps what was typed. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) if (typeof value === "string") values[key] = value;
  return values;
}

export function parseForm<S extends z.ZodType>(schema: S, formData: FormData) {
  const values = formValues(formData);
  const parsed = schema.safeParse(values);
  if (parsed.success) return { data: parsed.data as z.output<S>, values };
  return { values, state: { errors: z.flattenError(parsed.error).fieldErrors as FormErrors, values } satisfies FormState };
}

const DECIMAL_ERROR = "Informe um número válido.";

/** pt-BR typing to a dot decimal: "4.800,50" → "4800.50"; without a comma the dot stays the decimal point ("4800.50"). */
export function normalizeDecimal(raw: string): string {
  const t = raw.trim();
  return t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
}

/** "4.800" could be 4800 or 4,8: money must not guess, so the form asks for the comma. */
export const isAmbiguousDecimal = (raw: string) => /^-?\d{1,3}(\.\d{3})+$/.test(raw.trim());
const AMBIGUOUS_ERROR = "Use vírgula nos centavos, ex.: 4.800,00 ou 4800,00.";
/**
 * Django DecimalField from an <input type=number>: at most `maxDigits` digits, `places` decimals,
 * returned as a fixed-decimal string for a numeric column ("" → null when optional).
 */
export function decimalField<O extends boolean = false>(
  opts: { maxDigits?: number; places?: number; min?: number; max?: number; optional?: O; minMessage?: string } = {},
): z.ZodType<O extends true ? string | null : string, string | undefined> {
  const { maxDigits = 10, places = 2, min, max, optional } = opts;
  const field = z
    .string()
    .default("")
    .transform((raw, ctx) => {
      if (isAmbiguousDecimal(raw)) {
        ctx.addIssue({ code: "custom", message: AMBIGUOUS_ERROR });
        return z.NEVER;
      }
      const v = normalizeDecimal(raw);
      if (!v) {
        if (optional) return null;
        ctx.addIssue({ code: "custom", message: REQUIRED });
        return z.NEVER;
      }
      const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(v);
      if (!match || (!match[2] && !match[3])) {
        ctx.addIssue({ code: "custom", message: DECIMAL_ERROR });
        return z.NEVER;
      }
      const intDigits = match[2].replace(/^0+(?=\d)/, "");
      const decimals = (match[3] ?? "").replace(/0+$/, "");
      if (decimals.length > places) {
        ctx.addIssue({ code: "custom", message: `Use no máximo ${places} casas decimais.` });
        return z.NEVER;
      }
      if (intDigits.length > maxDigits - places) {
        ctx.addIssue({ code: "custom", message: `Use no máximo ${maxDigits - places} dígitos antes da vírgula.` });
        return z.NEVER;
      }
      const n = Number(v); // only for the range check; the stored value is the string below
      if (min !== undefined && n < min) {
        ctx.addIssue({ code: "custom", message: opts.minMessage ?? `Informe um valor a partir de ${min}.` });
        return z.NEVER;
      }
      if (max !== undefined && n > max) {
        ctx.addIssue({ code: "custom", message: `Informe um valor de no máximo ${max}.` });
        return z.NEVER;
      }
      return `${match[1]}${intDigits || "0"}.${(match[3] ?? "").padEnd(places, "0").slice(0, places)}`;
    });
  return field as unknown as z.ZodType<O extends true ? string | null : string, string | undefined>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const requiredDate = z.string({ error: REQUIRED }).min(1, REQUIRED).regex(DATE_RE, "Informe uma data válida.");
export const optionalDate = z
  .string()
  .default("")
  .refine((v) => v === "" || DATE_RE.test(v), "Informe uma data válida.")
  .transform((v) => v || null);
/** Required whole number in [min, max]. */
export const intField = (min: number, max: number) =>
  z
    .string({ error: REQUIRED })
    .trim()
    .min(1, REQUIRED)
    .transform((v, ctx) => {
      const n = Number(v);
      if (!Number.isInteger(n)) ctx.addIssue({ code: "custom", message: "Informe um número inteiro." });
      else if (n < min) ctx.addIssue({ code: "custom", message: `Informe um valor a partir de ${min}.` });
      else if (n > max) ctx.addIssue({ code: "custom", message: `Informe um valor de no máximo ${max}.` });
      else return n;
      return z.NEVER;
    });

/**
 * Where "Registrar e começar outra" goes: the new form again, keeping the fields a series of records shares
 * (date, type) so only the student changes. `saved` is the new row's id: it remounts the form between saves.
 */
export function anotherUrl(newPath: string, formData: FormData, keep: string[], savedId: number): string | null {
  if (formData.get("next") !== "another") return null;
  // No toast: the next form names who was saved (`last`, an enrollment id looked up on the page, never text)
  const q = new URLSearchParams({ saved: String(savedId) });
  const enrollment = formData.get("enrollmentId");
  if (typeof enrollment === "string" && enrollment) q.set("last", enrollment);
  for (const key of keep) {
    const v = formData.get(key);
    if (typeof v === "string" && v) q.set(key, v);
  }
  return `${newPath}?${q}`;
}

/** Money from what the user typed ("1.234,56", "1234,56"), for live previews; null while it isn't a number yet. */
export function parseMoney(raw: string): Money | null {
  try {
    return isAmbiguousDecimal(raw) ? null : money(normalizeDecimal(raw) || 0);
  } catch {
    return null;
  }
}
