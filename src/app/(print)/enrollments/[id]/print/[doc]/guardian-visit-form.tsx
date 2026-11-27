"use client";

import { SHIFT_PERIODS, guardianVisitText } from "@/lib/enrollment-report";
import { maskCpf } from "@/lib/format";
import { BLANK_FIELD, BlanksForm, createBlanks } from "./blanks";

const { Provider, Blank, Input, useBlanks } = createBlanks(guardianVisitText);

/** Holds the guardian's declaração de comparecimento blanks, so the toolbar form and the document share them. */
export function GuardianVisitProvider({ date, children }: { date: string; children: React.ReactNode }) {
  return <Provider initial={{ name: "", rg: "", issuer: "", cpf: "", date, shift: "" }}>{children}</Provider>;
}

/** One blank of the document, as printed (a line while it's empty). */
export const GuardianVisitBlank = Blank;

/** The blanks, in the print toolbar. */
export function GuardianVisitForm() {
  const { value, set } = useBlanks();
  return (
    <BlanksForm>
      <Input name="name" label="Nome" maxLength={200} className={`${BLANK_FIELD} w-56`} />
      <Input name="rg" label="RG" maxLength={20} className={`${BLANK_FIELD} w-28`} />
      <Input name="issuer" label="Órgão" maxLength={20} placeholder="SSP/DF" className={`${BLANK_FIELD} w-24`} />
      <label className="flex items-center gap-1">
        CPF
        <input
          value={value.cpf}
          onChange={(e) => set("cpf", maskCpf(e.target.value))}
          inputMode="numeric"
          placeholder="000.000.000-00"
          className={`${BLANK_FIELD} w-36`}
        />
      </label>
      <Input name="date" label="no dia" type="date" />
      <label className="flex items-center gap-1">
        período
        <select value={value.shift} onChange={(e) => set("shift", e.target.value)} className={BLANK_FIELD}>
          <option value="">—</option>
          {Object.entries(SHIFT_PERIODS).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </BlanksForm>
  );
}
