"use client";

import { EXAM_KINDS, type ExamRequest, examRequestText } from "@/lib/enrollment-report";
import { BLANK_FIELD, BlanksForm, createBlanks } from "./blanks";

const EMPTY: ExamRequest = { missedOn: "", kind: "", subject: "", date: "", time: "", value: "" };
const { Provider, Blank, Input, useBlanks } = createBlanks(examRequestText);

/** Holds the requerimento's blanks, so the toolbar form and the document below it share them as she types. */
export function ExamRequestProvider({ children }: { children: React.ReactNode }) {
  return <Provider initial={EMPTY}>{children}</Provider>;
}

/** One blank of the document, as printed (a line while it's empty). */
export const ExamBlank = Blank;

/** The blanks, in the print toolbar. */
export function ExamRequestForm({ subjects }: { subjects: string[] }) {
  const { value, set } = useBlanks();
  return (
    <BlanksForm>
      <Input name="missedOn" label="Ocorrida em" type="date" />
      <label className="flex items-center gap-1">
        Prova
        <select value={value.kind} onChange={(e) => set("kind", e.target.value)} className={BLANK_FIELD}>
          <option value="">—</option>
          {EXAM_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        de
        <select value={value.subject} onChange={(e) => set("subject", e.target.value)} className={BLANK_FIELD}>
          <option value="">
            {subjects.length ? "—" : "Nenhuma matéria cadastrada (Cadastros acadêmicos › Matérias)"}
          </option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <Input name="date" label="Substitutiva em" type="date" />
      <Input name="time" label="às" type="time" />
      <Input name="value" label="Valor R$" inputMode="decimal" placeholder="0,00" className={`${BLANK_FIELD} w-24`} />
    </BlanksForm>
  );
}
