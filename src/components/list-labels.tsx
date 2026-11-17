"use client";

import { createContext, useContext } from "react";

const Headers = createContext<string[]>([]);

/** Gives the list's column names to the cells below it (ListPage is a Server Component, so this is the bridge). */
export function ListHeaders({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <Headers.Provider value={headers}>{children}</Headers.Provider>;
}

/** On phones a row is a card with no header row above it: each cell names its column. */
export function CellLabel({ i }: { i: number }) {
  const label = useContext(Headers)[i];
  return label ? <span className="block text-xs font-normal text-gray-500 sm:hidden">{label}</span> : null;
}
