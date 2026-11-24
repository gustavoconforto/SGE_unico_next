"use client";

import { Button, Label, Select } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISCARD } from "@/components/form-fields";
import { GRADE_PERIODS } from "@/lib/grades";

type Options = [number, string][];
type Selection = { year: number | null; klass: number | null; subject: number | null; period: number | null };

/** Year → class → subject → period; changing one clears the ones after it (grade_selection). */
export function GradePicker({
  basePath,
  years,
  classes,
  subjects,
  selected,
  periods = true,
}: {
  basePath: string;
  years: Options;
  classes: Options;
  subjects: Options;
  selected: Selection;
  periods?: boolean;
}) {
  const router = useRouter();
  // On phones a complete choice folds into one line, so the sheet starts near the top
  const [open, setOpen] = useState(false);
  const label = (options: readonly (readonly [number, string])[], v: number | null) =>
    options.find(([id]) => id === v)?.[1];
  const summary =
    selected.period &&
    [label(classes, selected.klass), label(subjects, selected.subject), label(GRADE_PERIODS, selected.period)]
      .filter(Boolean)
      .join(" · ");
  const go = (s: Partial<Selection>) => {
    // The grade sheet below marks itself dirty; switching the sheet would drop the typed grades
    if (document.querySelector("form[data-dirty]") && !window.confirm(DISCARD)) return;
    const p = new URLSearchParams();
    if (s.year) p.set("school_year", String(s.year));
    if (s.klass) p.set("school_class", String(s.klass));
    if (s.subject) p.set("subject", String(s.subject));
    if (s.period) p.set("bimester", String(s.period));
    setOpen(false);
    router.replace(`${basePath}?${p}`, { scroll: false });
  };
  const num = (v: string) => (v ? Number(v) : null);
  const field = (
    id: string,
    label: string,
    value: number | null,
    options: readonly (readonly [number, string])[],
    onChange: (v: number | null) => void,
    disabled = false,
  ) => (
    <div className="w-full sm:w-48">
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
    <>
      {summary && (
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <p className="font-medium text-gray-900">{summary}</p>
          <Button
            color="alternative"
            className="min-h-11"
            aria-expanded={open}
            aria-controls="grade-picker"
            onClick={() => setOpen(!open)}
          >
            {open ? "Fechar" : "Trocar"}
          </Button>
        </div>
      )}
      <div id="grade-picker" className={`${summary && !open ? "hidden" : "flex"} flex-wrap gap-4 sm:flex`}>
        {field("school_year", "Ano letivo", selected.year, years, (year) => go({ year }))}
        {field(
          "school_class",
          "Turma",
          selected.klass,
          classes,
          (klass) => go({ year: selected.year, klass }),
          !selected.year,
        )}
        {field(
          "subject",
          "Matéria",
          selected.subject,
          subjects,
          (subject) => go({ ...selected, subject, period: selected.period }),
          !selected.klass,
        )}
        {periods &&
          field(
            "bimester",
            "Período",
            selected.period,
            GRADE_PERIODS,
            (period) => go({ ...selected, period }),
            !selected.subject,
          )}
      </div>
    </>
  );
}
