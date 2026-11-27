"use client";

import { createContext, useContext, useState } from "react";

/** The class of a blank's input or select in the dark print toolbar. */
export const BLANK_FIELD = "rounded-md bg-white px-2 py-1 text-sm text-gray-900";

/**
 * The blanks of a printout the secretaria fills in the toolbar: `Provider` holds the typed values so the toolbar and
 * the document share them, `Blank` prints one through `text` (a line while empty), `Input` is a labeled toolbar input.
 */
export function createBlanks<T extends Record<string, string>, P extends Record<string, string>>(text: (v: T) => P) {
  const Context = createContext<{ value: T; set: (key: keyof T, v: string) => void } | null>(null);
  const useBlanks = () => useContext(Context)!;

  function Provider({ initial, children }: { initial: T; children: React.ReactNode }) {
    const [value, setValue] = useState(initial);
    const set = (key: keyof T, v: string) => setValue((old) => ({ ...old, [key]: v }));
    return <Context value={{ value, set }}>{children}</Context>;
  }

  function Blank({ name }: { name: keyof P }) {
    return text(useBlanks().value)[name];
  }

  function Input({ name, label, ...props }: { name: keyof T; label: string } & React.ComponentProps<"input">) {
    const { value, set } = useBlanks();
    return (
      <label className="flex items-center gap-1">
        {label}
        <input value={value[name]} onChange={(e) => set(name, e.target.value)} className={BLANK_FIELD} {...props} />
      </label>
    );
  }

  return { Provider, Blank, Input, useBlanks };
}

/** The toolbar form around a printout's blanks; Enter doesn't submit. */
export function BlanksForm({ children }: { children: React.ReactNode }) {
  return (
    <form className="mr-auto flex flex-wrap items-center gap-2 text-sm text-white" onSubmit={(e) => e.preventDefault()}>
      {children}
    </form>
  );
}
