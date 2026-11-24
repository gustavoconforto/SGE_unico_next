"use client";

import { Alert, Button, Label, Select } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type ConceptResult, type GradeKind, computeAll, computeIndividual } from "./actions";

const BIMESTERS = [1, 2, 3, 4];

/** Picks (enrollment and) bimester in the URL, and recomputes the concept grades. */
export function ConceptControls({
  kind = "concept",
  enrollments,
  enrollmentId,
  bimester,
  mode,
}: {
  kind?: GradeKind;
  enrollments?: [number, string][];
  enrollmentId?: number | null;
  bimester: number | null;
  mode: "individual" | "all";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ConceptResult>({});
  const go = (e: number | null | undefined, b: number | null) => {
    const p = new URLSearchParams();
    if (e) p.set("enrollment", String(e));
    if (b) p.set("bimester", String(b));
    setResult({});
    router.replace(`?${p}`, { scroll: false });
  };
  const compute = () =>
    start(async () => {
      setResult(
        mode === "all" ? await computeAll(kind, bimester!) : await computeIndividual(kind, enrollmentId!, bimester!),
      );
      router.refresh();
    });
  const ready = !!bimester && (mode === "all" || !!enrollmentId);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        {mode === "individual" && (
          <div className="min-w-72">
            <Label htmlFor="enrollment">Aluno</Label>
            <Select
              id="enrollment"
              value={enrollmentId ?? ""}
              onChange={(e) => go(Number(e.target.value) || null, bimester)}
            >
              <option value="">Selecione um aluno</option>
              {enrollments!.map(([id, l]) => (
                <option key={id} value={id}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="w-48">
          <Label htmlFor="bimester">Bimestre</Label>
          <Select
            id="bimester"
            value={bimester ?? ""}
            onChange={(e) => go(enrollmentId, Number(e.target.value) || null)}
          >
            <option value="">Selecione um bimestre</option>
            {BIMESTERS.map((b) => (
              <option key={b} value={b}>
                {b}º bimestre
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={compute} disabled={!ready || pending}>
          {pending
            ? "Calculando…"
            : mode === "all"
              ? "Calcular para todos"
              : kind === "extra"
                ? "Calcular nota extra"
                : "Calcular conceito"}
        </Button>
      </div>
      {result.ok && <Alert color="success">{result.ok}</Alert>}
      {result.warning && <Alert color="warning">{result.warning}</Alert>}
      {result.error && <Alert color="failure">{result.error}</Alert>}
    </div>
  );
}
