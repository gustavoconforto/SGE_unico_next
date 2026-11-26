"use client";

import { startTransition, useActionState, useState } from "react";
import { FormButtons, FormFields } from "@/components/form-fields";
import { StudentChecklist } from "@/components/student-checklist";
import { saveBatchExits } from "../actions";

type Props = { exitDate: string; schoolYearId: number; reasonId: number; students: [number, string][] };

/** The active students of the year, A→Z. */
export function BatchExitForm({ exitDate, schoolYearId, reasonId, students }: Props) {
  const [state, action, pending] = useActionState(saveBatchExits, {});
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  if (!students.length)
    return <p className="text-sm text-gray-700">Nenhum aluno com matrícula ativa neste ano letivo.</p>;
  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="exitDate" value={exitDate} />
      <input type="hidden" name="schoolYearId" value={schoolYearId} />
      <input type="hidden" name="reasonId" value={reasonId} />
      <FormFields state={state}>
        <StudentChecklist students={students} checked={checked} onCheckedChange={setChecked} />
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/releases"
        sticky
        label={`Registrar ${checked.size ? `${checked.size} ` : ""}liberaç${checked.size === 1 ? "ão" : "ões"}`}
      />
    </form>
  );
}
