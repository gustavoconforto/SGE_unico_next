// Receivable and payable accounts share every page; this is what differs (Django's AccountContextMixin).
import { notFound } from "next/navigation";
import { Direction } from "@/lib/finance";

export const KINDS = {
  receivable: {
    direction: Direction.RECEIVABLE,
    resource: "finance",
    title: "A receber",
    noun: "duplicata a receber",
    counterpartLabel: "Responsável",
    newLabel: "Nova conta a receber",
  },
  payable: {
    direction: Direction.PAYABLE,
    resource: "payables",
    title: "A pagar",
    noun: "duplicata a pagar",
    counterpartLabel: "Fornecedor",
    newLabel: "Nova conta a pagar",
  },
} as const;

export type Kind = keyof typeof KINDS;

/** The `[kind]` route segment, or 404. */
export async function kindParam(params: Promise<{ kind: string }>): Promise<Kind> {
  const { kind } = await params;
  if (kind !== "receivable" && kind !== "payable") notFound();
  return kind;
}

export const kindOf = (direction: string): Kind => (direction === Direction.RECEIVABLE ? "receivable" : "payable");
