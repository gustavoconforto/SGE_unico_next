"use client";

import { Dropdown, DropdownItem } from "flowbite-react";

const DOCUMENTS = [
  ["contrato", "Contrato"],
  ["requerimento", "Requerimento de matrícula"],
  ["ficha", "Ficha de matrícula"],
  ["declaracao", "Declaração de escolaridade"],
  ["comparecimento", "Declaração de comparecimento"],
  ["substitutiva", "Requerimento de prova substitutiva"],
] as const;

type Doc = (typeof DOCUMENTS)[number][0];

/**
 * The enrollment printouts (Django's "Imprimir" menu on the edit page).
 * `blocked`: why a document can't be generated yet (Django's guards), shown on a disabled item instead of failing after the click.
 */
export function PrintMenu({ id, blocked }: { id: number; blocked: Record<Doc, string | null> }) {
  return (
    <Dropdown label="Imprimir" color="alternative">
      {DOCUMENTS.map(([doc, name]) =>
        blocked[doc] ? (
          <DropdownItem key={doc} disabled className="cursor-not-allowed hover:bg-transparent">
            <span className="flex flex-col items-start">
              <span className="text-gray-400">{name}</span>
              <span className="text-xs text-gray-600">{blocked[doc]}</span>
            </span>
          </DropdownItem>
        ) : (
          <DropdownItem key={doc} as="a" href={`/enrollments/${id}/print/${doc}`} target="_blank" rel="noopener">
            {name}
          </DropdownItem>
        ),
      )}
    </Dropdown>
  );
}
