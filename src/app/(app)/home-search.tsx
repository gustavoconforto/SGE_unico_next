"use client";

import { useEffect, useRef } from "react";

/** The home search input: focused on desktop so staff can type at once, never on phones, where focus opens the keyboard. */
export function HomeSearchInput() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) ref.current?.focus();
  }, []);
  return (
    <input
      ref={ref}
      id="home-search"
      name="q"
      type="search"
      placeholder="Nome, matrícula ou CPF"
      className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-600 focus:ring-blue-600"
    />
  );
}
