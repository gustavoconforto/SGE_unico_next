"use client";

import { Label, Select, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";

/** Class (and optionally date) in the query string. */
export function ClassDatePicker({
  classes,
  classId,
  date,
  withDate = false,
}: {
  classes: [number, string][];
  classId: number | null;
  date?: string;
  withDate?: boolean;
}) {
  const router = useRouter();
  const go = (c: number | null, d?: string) => {
    const p = new URLSearchParams();
    if (c) p.set("school_class", String(c));
    if (d) p.set("date", d);
    router.replace(`?${p}`, { scroll: false });
  };
  return (
    <div className="flex flex-wrap gap-4">
      <div className="w-72">
        <Label htmlFor="school_class">Turma</Label>
        <Select id="school_class" value={classId ?? ""} onChange={(e) => go(Number(e.target.value) || null, date)}>
          <option value="">Selecione uma turma</option>
          {classes.map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      {withDate && (
        <div className="w-48">
          <Label htmlFor="date">Data</Label>
          <TextInput id="date" type="date" value={date ?? ""} onChange={(e) => go(classId, e.target.value)} />
        </div>
      )}
    </div>
  );
}
