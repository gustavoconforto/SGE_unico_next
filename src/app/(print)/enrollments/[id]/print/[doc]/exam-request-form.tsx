"use client";

import { createContext, useContext, useState } from "react";
import { EXAM_KINDS, type ExamRequest, examRequestText } from "@/lib/enrollment-report";

const field = "rounded-md bg-white px-2 py-1 text-sm text-gray-900";
const EMPTY: ExamRequest = { missedOn: "", kind: "", subject: "", date: "", time: "", value: "" };
const ExamRequestContext = createContext<{
  value: ExamRequest;
  set: (key: keyof ExamRequest, v: string) => void;
} | null>(null);
const useExamRequest = () => useContext(ExamRequestContext)!;

/** Holds the requerimento's blanks, so the toolbar form and the document below it share them as she types. */
export function ExamRequestProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState(EMPTY);
  const set = (key: keyof ExamRequest, v: string) => setValue((old) => ({ ...old, [key]: v }));
  return <ExamRequestContext value={{ value, set }}>{children}</ExamRequestContext>;
}

/** One blank of the document, as printed (a line while it's empty). */
export function ExamBlank({ name }: { name: keyof ReturnType<typeof examRequestText> }) {
  return examRequestText(useExamRequest().value)[name];
}

/** The blanks, in the print toolbar. */
export function ExamRequestForm({ subjects }: { subjects: string[] }) {
  const { value, set } = useExamRequest();
  const input = (key: keyof ExamRequest, label: string, props: React.ComponentProps<"input">) => (
    <label className="flex items-center gap-1">
      {label}
      <input value={value[key]} onChange={(e) => set(key, e.target.value)} className={field} {...props} />
    </label>
  );
  return (
    <form className="mr-auto flex flex-wrap items-center gap-2 text-sm text-white" onSubmit={(e) => e.preventDefault()}>
      {input("missedOn", "Ocorrida em", { type: "date" })}
      <label className="flex items-center gap-1">
        Prova
        <select value={value.kind} onChange={(e) => set("kind", e.target.value)} className={field}>
          <option value="">—</option>
          {EXAM_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        de
        <select value={value.subject} onChange={(e) => set("subject", e.target.value)} className={field}>
          <option value="">
            {subjects.length ? "—" : "Nenhuma matéria cadastrada (Cadastros acadêmicos › Matérias)"}
          </option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {input("date", "Substitutiva em", { type: "date" })}
      {input("time", "às", { type: "time" })}
      {input("value", "Valor R$", { inputMode: "decimal", placeholder: "0,00", className: `${field} w-24` })}
    </form>
  );
}
