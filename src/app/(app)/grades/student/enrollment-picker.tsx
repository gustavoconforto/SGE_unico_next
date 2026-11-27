"use client";

import { Label, Select, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";

/** Enrollment (and, when `date` is given, a date) in the query string. */
export function EnrollmentPicker({
  options,
  value,
  date,
}: {
  options: [number, string][];
  value: number | null;
  date?: string;
}) {
  const router = useRouter();
  const go = (e: string, d?: string) => {
    const p = new URLSearchParams();
    if (e) p.set("enrollment", e);
    if (d) p.set("date", d);
    router.replace(`?${p}`, { scroll: false });
  };
  return (
    <div className="flex flex-wrap gap-4">
      <div className="w-full max-w-xl">
        <Label htmlFor="enrollment">Aluno</Label>
        <Select id="enrollment" value={value ?? ""} onChange={(e) => go(e.target.value, date)}>
          <option value="">Selecione um aluno</option>
          {options.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {date !== undefined && (
        <div className="w-48">
          <Label htmlFor="date">Data</Label>
          <TextInput
            id="date"
            type="date"
            value={date}
            onChange={(e) => go(value ? String(value) : "", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
