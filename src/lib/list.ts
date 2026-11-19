// Port of base/search.py apply_search + Django's paginate_by = 10.
import { notFound } from "next/navigation";
import { type SQL, asc, desc, ilike, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const PAGE_SIZE = 25;

type SearchParams = Record<string, string | string[] | undefined>;

export function param(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

/** `?page=` as a 1-based integer, defaulting to 1 for anything invalid. */
export function pageParam(searchParams: SearchParams): number {
  const page = Number.parseInt(param(searchParams, "page"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// shortcut: accent folding by translate(), since the DB has no unaccent extension (Django owns it); covers pt-BR letters only
const ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ";
const PLAIN = "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";
export const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
export const foldSql = (c: AnyPgColumn | SQL): SQL => sql`translate(${c}, ${ACCENTED}, ${PLAIN})`;

/**
 * The texts a search looks for: the query without accents, plus its digits alone when it is a formatted
 * number ("123.456.789-00"), since CPF, CNPJ and CEP are stored as digits.
 */
export function searchTerms(query: string): string[] {
  const plain = stripAccents(query);
  const digits = query.replace(/\D/g, "");
  return /^[\d.\-/()\s]+$/.test(query) && digits && digits !== query ? [plain, digits] : [plain];
}

/** Case-insensitive "contains" over the columns, OR'ed together (Django's icontains), ignoring accents: "otavio" finds "Otávio". */
export function searchWhere(query: string, columns: (AnyPgColumn | SQL)[]): SQL | undefined {
  if (!query || columns.length === 0) return undefined;
  return or(...searchTerms(query).flatMap((term) => columns.map((column) => ilike(foldSql(column), likePattern(term)))));
}

/** `%query%` with LIKE wildcards escaped. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

/** `[id]` route param as a positive integer, or 404. */
export async function idParam(params: Promise<{ id: string }>): Promise<number> {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return id;
}

/** `?sort=key` (ascending) or `?sort=-key` (descending) over the list's sortable `columns`; null when absent or unknown. */
export function sortParam(searchParams: SearchParams, columns: Record<string, AnyPgColumn | SQL>): { param: string; order: SQL } | null {
  const raw = param(searchParams, "sort");
  const descending = raw.startsWith("-");
  const key = descending ? raw.slice(1) : raw;
  if (!Object.hasOwn(columns, key)) return null;
  return { param: raw, order: descending ? desc(columns[key]) : asc(columns[key]) };
}
