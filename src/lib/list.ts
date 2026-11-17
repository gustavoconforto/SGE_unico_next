// Port of base/search.py apply_search + Django's paginate_by = 10.
import { notFound } from "next/navigation";
import { type SQL, asc, desc, ilike, or } from "drizzle-orm";
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

/** Case-insensitive "contains" over the columns, OR'ed together (Django's icontains). */
export function searchWhere(query: string, columns: (AnyPgColumn | SQL)[]): SQL | undefined {
  if (!query || columns.length === 0) return undefined;
  const pattern = likePattern(query);
  return or(...columns.map((column) => ilike(column, pattern)));
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
