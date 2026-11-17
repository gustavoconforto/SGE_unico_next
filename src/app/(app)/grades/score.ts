// One score cell (Django's score_field): optional, comma decimals, 0 to the exam's maximum, 2 places.
import Decimal from "decimal.js";

/** Two people saved the same sheet at once: the second save hits a unique grade constraint. */
export const SHEET_TAKEN = "Outra pessoa acabou de salvar notas nesta planilha. Recarregue a página e confira. Nenhuma nota foi salva.";

export function parseScore(raw: string, maxScore: string): { score: string | null } | { error: string } {
  const v = raw.trim().replace(",", ".");
  if (!v) return { score: null };
  if (!/^\d{1,2}(\.\d{0,2})?$/.test(v) && !/^\.\d{1,2}$/.test(v)) {
    return /^\d*\.\d{3,}$/.test(v) ? { error: "Use no máximo 2 casas decimais." } : { error: "Informe um número." };
  }
  const n = new Decimal(v);
  if (n.gt(maxScore)) return { error: `A nota máxima é ${new Decimal(maxScore).toFixed(2).replace(".", ",")}.` };
  return { score: n.toFixed(2) };
}

/** Saved score as the inputs show it: "2,50". */
export const scoreInput = (score: string | null | undefined) => (score ? new Decimal(score).toFixed(2).replace(".", ",") : "");

/** Hidden input holding what a score cell showed when the page loaded. */
export const shownName = (name: string) => `shown_${name}`;

/**
 * What the user typed in a cell, or null when they left it as loaded or it wasn't on their page:
 * saving a sheet must not blank a grade someone else entered meanwhile.
 */
export function editedCell(values: Record<string, string>, name: string): string | null {
  const raw = values[name];
  if (raw === undefined) return null;
  const shown = values[shownName(name)];
  return shown !== undefined && shown.trim() === raw.trim() ? null : raw;
}
