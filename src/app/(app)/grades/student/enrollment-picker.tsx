"use client";

import { Label, Select } from "flowbite-react";
import { useRouter } from "next/navigation";

export function EnrollmentPicker({ options, value }: { options: [number, string][]; value: number | null }) {
  const router = useRouter();
  return (
    <div className="max-w-xl">
      <Label htmlFor="enrollment">Aluno</Label>
      <Select id="enrollment" value={value ?? ""} onChange={(e) => router.replace(e.target.value ? `?enrollment=${e.target.value}` : "?", { scroll: false })}>
        <option value="">Selecione um aluno</option>
        {options.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}
