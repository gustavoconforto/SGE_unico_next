"use client";

import { Button } from "flowbite-react";
import { useRef } from "react";
import { maskZipCode } from "@/lib/format";
import { Combobox } from "./combobox";

/** The <PersonFields> "Endereço" fields of a saved person. */
export type Address = { address: string; neighborhood: string; city: string; state: string; zipCode: string };
export type AddressSource = Address & { id: number; name: string };

const FIELDS = ["address", "neighborhood", "city", "state", "zipCode"] as const;

const hasAddress = (a: Address) => FIELDS.some((f) => a[f]);

/** Writes the address into the uncontrolled inputs; the input event clears their old errors (FormFields listens). */
function fillAddress(from: HTMLElement, source: Address) {
  const form = from.closest("form");
  for (const f of FIELDS) {
    const input = form?.elements.namedItem(f) as HTMLInputElement | HTMLSelectElement | null;
    if (!input) continue;
    input.value = f === "zipCode" ? maskZipCode(source[f]) : source[f];
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/** One button per person (the student's picked guardians); people with no address are named instead, so it's clear why. */
export function CopyAddressButtons({ sources }: { sources: AddressSource[] }) {
  if (!sources.length) return null;
  const shown = sources.filter(hasAddress);
  const missing = sources.filter((s) => !hasAddress(s)).map((s) => s.name);
  return (
    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
      {shown.map((s) => (
        <Button key={s.id} size="sm" color="alternative" onClick={(e) => fillAddress(e.currentTarget, s)}>
          <span className="material-symbols-outlined" aria-hidden="true">
            content_copy
          </span>{" "}
          Copiar endereço de {s.name}
        </Button>
      ))}
      {missing.length > 0 && (
        <p className="text-sm text-gray-600">Sem endereço cadastrado para copiar: {missing.join(", ")}.</p>
      )}
    </div>
  );
}

/** Search any saved person and copy their address (a mother registered after the father). */
export function CopyAddressSearch({ sources }: { sources: AddressSource[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const byId = new Map(sources.filter(hasAddress).map((s) => [String(s.id), s]));
  if (!byId.size) return null;
  return (
    <div ref={ref} className="sm:col-span-2">
      <Combobox
        id="copy-address"
        label="Copiar endereço de outro responsável"
        optional
        placeholder="Buscar responsável pelo nome…"
        emptyText="Nenhum responsável com endereço e esse nome."
        options={[...byId.values()].map((s) => ({ value: String(s.id), label: s.name, hint: s.address || s.city }))}
        value=""
        onChange={(v) => {
          const source = byId.get(v);
          if (source && ref.current) fillAddress(ref.current, source);
        }}
      />
    </div>
  );
}
