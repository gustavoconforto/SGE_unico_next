"use client";

import { useRouter } from "next/navigation";

export function BimesterSelect({ value }: { value: number }) {
  const router = useRouter();
  return (
    <select aria-label="Bimestre" value={value} onChange={(e) => router.replace(`?bimester=${e.target.value}`)} className="rounded-md bg-white px-2 py-1 text-sm text-gray-900">
      {[1, 2, 3, 4].map((b) => (
        <option key={b} value={b}>
          {b}º bimestre
        </option>
      ))}
    </select>
  );
}
