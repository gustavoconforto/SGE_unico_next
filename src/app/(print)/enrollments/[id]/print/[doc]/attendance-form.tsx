"use client";

import { createContext, useContext, useState } from "react";
import { type Attendance, SHIFT_PERIODS, type StudentFacts, attendanceDeclaration } from "@/lib/enrollment-report";
import { Paragraphs } from "../paragraphs";

const field = "rounded-md bg-white px-2 py-1 text-sm text-gray-900";
const AttendanceContext = createContext<{
  facts: StudentFacts;
  value: Attendance;
  set: (key: keyof Attendance, v: string) => void;
} | null>(null);
const useAttendance = () => useContext(AttendanceContext)!;

/**
 * Holds the declaração de comparecimento's blanks, so the toolbar form and the document below it share them. The
 * text is built here in the browser, so what is printed is always what was typed.
 */
export function AttendanceProvider({
  facts,
  initial,
  children,
}: {
  facts: StudentFacts;
  initial: Attendance;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const set = (key: keyof Attendance, v: string) => setValue((old) => ({ ...old, [key]: v }));
  return <AttendanceContext value={{ facts, value, set }}>{children}</AttendanceContext>;
}

export function AttendanceBody() {
  const { facts, value } = useAttendance();
  return <Paragraphs paragraphs={attendanceDeclaration(facts, value)} />;
}

/** The blanks, in the print toolbar; "Baixar Word" sends them to the .docx route. */
export function AttendanceForm({ docx }: { docx: string }) {
  const { value, set } = useAttendance();
  const query = new URLSearchParams({
    evento: value.event,
    data: value.date,
    turno: value.shift,
    das: value.from,
    as: value.to,
  });
  return (
    <form className="mr-auto flex flex-wrap items-center gap-2 text-sm text-white" onSubmit={(e) => e.preventDefault()}>
      <label className="flex items-center gap-1">
        Presente na
        <input
          value={value.event}
          onChange={(e) => set("event", e.target.value)}
          maxLength={200}
          className={`${field} w-52`}
        />
      </label>
      <label className="flex items-center gap-1">
        no dia
        <input type="date" value={value.date} onChange={(e) => set("date", e.target.value)} className={field} />
      </label>
      <label className="flex items-center gap-1">
        turno
        <select value={value.shift} onChange={(e) => set("shift", e.target.value)} className={field}>
          <option value="">—</option>
          {Object.entries(SHIFT_PERIODS).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        das
        <input type="time" value={value.from} onChange={(e) => set("from", e.target.value)} className={field} />
      </label>
      <label className="flex items-center gap-1">
        às
        <input type="time" value={value.to} onChange={(e) => set("to", e.target.value)} className={field} />
      </label>
      <a href={`${docx}?${query}`} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white">
        Baixar Word
      </a>
    </form>
  );
}
