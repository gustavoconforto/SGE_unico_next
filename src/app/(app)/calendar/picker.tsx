"use client";

import { Label, Select } from "flowbite-react";
import { useRouter } from "next/navigation";

/** School year then month; changing the year clears the month. */
export function CalendarPicker(props: {
  years: [number, string][];
  months: [string, string][];
  yearId: number | null;
  /** The year's saved days checked as letivo. */
  schoolDays: number | null;
  month: string | null;
}) {
  const router = useRouter();
  const go = (params: Record<string, string>) =>
    router.replace(`/calendar?${new URLSearchParams(params)}`, { scroll: false });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        {props.schoolDays !== null && (
          <div className="text-center">
            <p className="text-xs text-gray-500">Dias letivos</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">{props.schoolDays}</p>
          </div>
        )}
        <div>
          <Label htmlFor="school_year" className="text-xs">
            Ano letivo
          </Label>
          <Select
            id="school_year"
            sizing="sm"
            className="min-w-32"
            value={props.yearId ?? ""}
            onChange={(e) => go(e.target.value ? { school_year: e.target.value } : {})}
          >
            <option value="">Selecione</option>
            {props.years.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {props.yearId && (
        <div>
          <Label htmlFor="month" className="text-xs">
            Mês
          </Label>
          <Select
            id="month"
            sizing="sm"
            className="min-w-48"
            value={props.month ?? ""}
            onChange={(e) =>
              go({ school_year: String(props.yearId), ...(e.target.value && { month: e.target.value }) })
            }
          >
            <option value="">Selecione</option>
            {props.months.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
