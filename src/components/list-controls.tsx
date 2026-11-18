"use client";

import { Label, Pagination, PaginationButton, Select, TextInput } from "flowbite-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function useSetParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  return (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    next.delete("msg"); // a toast belongs to the redirect that set it, not to later searches
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  };
}

/** Live search on ?q= (the htmx `keyup changed delay:300ms` behaviour). */
export function SearchBox({ placeholder = "Pesquisar..." }: { placeholder?: string }) {
  const setParams = useSetParams();
  const current = useSearchParams().get("q") ?? "";
  const [value, setValue] = useState(current);
  // The URL changed from outside (a menu link to the same list): show its search, or the box would write the old one back
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    if (current !== value.trim()) setValue(current);
  }

  useEffect(() => {
    if (value.trim() === current) return;
    const timer = setTimeout(() => setParams({ q: value.trim(), page: "" }), 300);
    return () => clearTimeout(timer);
  }, [value, current, setParams]);

  return <TextInput type="search" aria-label="Pesquisar" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} className="w-full sm:max-w-md" />;
}

// Flowbite's cyan active page is 3.5:1 on its tint; the app's navy passes 4.5:1
const PAGINATION_THEME = { pages: { selector: { active: "bg-primary-50 text-primary-800 hover:bg-primary-100 hover:text-primary-900" } } };

export function ListPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const setParams = useSetParams();
  if (totalPages <= 1) return null;
  const go = (p: number) => setParams({ page: p > 1 ? String(p) : "" });
  return (
    // Flowbite's <Pagination> is the <nav> landmark
    <div className="flex justify-center">
      {/* Five page buttons don't fit a phone: there it is the position plus previous / next */}
      <div className="flex items-center gap-3 sm:hidden">
        <span className="text-sm text-gray-700 tabular-nums">
          Página {page} de {totalPages}
        </span>
        <Pagination layout="navigation" currentPage={page} totalPages={totalPages} onPageChange={go} previousLabel="Anterior" nextLabel="Próxima" showIcons theme={PAGINATION_THEME} />
      </div>
      <Pagination
        className="hidden sm:block"
        // Flowbite marks the <li>; the button is what gets focus, so it carries "current page" too
        renderPaginationButton={(p) => <PaginationButton {...p} aria-current={p.active ? "page" : undefined} />}
        currentPage={page} totalPages={totalPages} onPageChange={go} previousLabel="Anterior" nextLabel="Próxima" showIcons theme={PAGINATION_THEME} />
    </div>
  );
}

/**
 * A list filter in the URL (Django's filter_form_class field). Changing it goes back to page 1.
 * `fallback`: the option applied when the URL has none (a work queue opens filtered); "all" then means no filter.
 */
export function FilterSelect({
  name,
  label,
  options,
  allLabel = "Todas",
  fallback,
}: {
  name: string;
  label: string;
  options: readonly (readonly [string | number, string])[];
  allLabel?: string;
  fallback?: string;
}) {
  const setParams = useSetParams();
  const value = useSearchParams().get(name) ?? fallback ?? "";
  return (
    <div>
      <Label htmlFor={`filter-${name}`} className="text-xs">
        {label}
      </Label>
      <Select id={`filter-${name}`} sizing="sm" className="min-w-32" value={value} onChange={(e) => setParams({ [name]: e.target.value === fallback ? "" : e.target.value, page: "" })}>
        <option value={fallback ? "all" : ""}>{allLabel}</option>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function FilterDate({ name, label }: { name: string; label: string }) {
  const setParams = useSetParams();
  const value = useSearchParams().get(name) ?? "";
  return (
    <div>
      <Label htmlFor={`filter-${name}`} className="text-xs">
        {label}
      </Label>
      <TextInput id={`filter-${name}`} type="date" sizing="sm" value={value} onChange={(e) => setParams({ [name]: e.target.value, page: "" })} />
    </div>
  );
}

/** A column header that sorts the list by `sortKey`: first click ascending, next click descending. */
export function SortHeader({ label, sortKey }: { label: string; sortKey: string }) {
  const setParams = useSetParams();
  const current = useSearchParams().get("sort") ?? "";
  const icon = current === sortKey ? "arrow_upward" : current === `-${sortKey}` ? "arrow_downward" : "unfold_more";
  return (
    <button type="button" onClick={() => setParams({ sort: current === sortKey ? `-${sortKey}` : sortKey, page: "" })} className="inline-flex items-center gap-1 uppercase hover:text-gray-900">
      {label}
      <span className={`material-symbols-outlined text-base ${icon === "unfold_more" ? "text-gray-400" : ""}`} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
