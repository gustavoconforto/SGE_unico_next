"use client";

/** "Voltar" and the browser's print dialog, where "Salvar como PDF" replaces Django's WeasyPrint download. */
export function PrintToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="sticky top-0 flex justify-end gap-2 bg-gray-900 px-4 py-3 print:hidden">
      {children}
      <button type="button" onClick={() => history.back()} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white">
        Voltar
      </button>
      <button type="button" onClick={() => window.print()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
        Imprimir / salvar PDF
      </button>
    </div>
  );
}
