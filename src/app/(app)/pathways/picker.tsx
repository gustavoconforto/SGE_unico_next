"use client";

import { Label, Select } from "flowbite-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Field = {
  name: string;
  label: string;
  empty: string;
  options: readonly (readonly [string | number, string])[];
  clears?: string[];
};

/** Selects kept in the URL (Django's GET pick forms); a field can clear the ones that depend on it. */
export function UrlPicker({ fields }: { fields: Field[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const change = (f: Field, value: string) => {
    const next = new URLSearchParams(sp);
    next.delete("msg");
    for (const n of [f.name, ...(f.clears ?? [])]) next.delete(n);
    if (value) next.set(f.name, value);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  };
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {fields.map((f) => (
        <div key={f.name}>
          <Label htmlFor={`pick-${f.name}`}>{f.label}</Label>
          <Select id={`pick-${f.name}`} value={sp.get(f.name) ?? ""} onChange={(e) => change(f, e.target.value)}>
            <option value="">{f.empty}</option>
            {f.options.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  );
}

export const BIMESTER_OPTIONS = [1, 2, 3, 4].map((b) => [b, `${b}º bimestre`] as const);
