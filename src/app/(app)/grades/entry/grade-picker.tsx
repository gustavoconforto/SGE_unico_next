"use client";

import { Label, Select } from "flowbite-react";
import { useRouter } from "next/navigation";
import { GRADE_PERIODS } from "@/lib/grades";

type Options = [number, string][];
type Selection = { year: number | null; klass: number | null; subject: number | null; period: number | null };

/** Year → class → subject → period; changing one clears the ones after it (grade_selection). */
export function GradePicker({ basePath, years, classes, subjects, selected, periods = true }: { basePath: string; years: Options; classes: Options; subjects: Options; selected: Selection; periods?: boolean }) {
  const router = useRouter();
  const go = (s: Partial<Selection>) => {
    const p = new URLSearchParams();
    if (s.year) p.set("school_year", String(s.year));
    if (s.klass) p.set("school_class", String(s.klass));
    if (s.subject) p.set("subject", String(s.subject));
    if (s.period) p.set("bimester", String(s.period));
    router.replace(`${basePath}?${p}`, { scroll: false });
  };
  const num = (v: string) => (v ? Number(v) : null);
  const field = (id: string, label: string, value: number | null, options: readonly (readonly [number, string])[], onChange: (v: number | null) => void, disabled = false) => (
    <div className="w-48">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(num(e.target.value))}>
        <option value="">Selecione</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </div>
  );
  return (
    <div className="flex flex-wrap gap-4">
      {field("school_year", "Ano letivo", selected.year, years, (year) => go({ year }))}
      {field("school_class", "Turma", selected.klass, classes, (klass) => go({ year: selected.year, klass }), !selected.year)}
      {field("subject", "Matéria", selected.subject, subjects, (subject) => go({ ...selected, subject, period: selected.period }), !selected.klass)}
      {periods && field("bimester", "Período", selected.period, GRADE_PERIODS, (period) => go({ ...selected, period }), !selected.subject)}
    </div>
  );
}
