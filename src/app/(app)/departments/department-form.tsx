"use client";

import { Checkbox, Label } from "flowbite-react";
import { useActionState } from "react";
import { Fieldset, FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveDepartment } from "./actions";

type Props = { id?: number | null; defaults?: { name: string }; teacherIds?: number[]; teachers: [number, string][] };

export function DepartmentForm({ id = null, defaults, teacherIds = [], teachers }: Props) {
  const [state, action, pending] = useActionState(saveDepartment.bind(null, id), {});
  const selected = new Set(state.values ? state.values.teachers.split(",").filter(Boolean).map(Number) : teacherIds);
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="name" label="Nome" maxLength={50} className="max-w-lg" />
        <Fieldset legend="Professores (opcional)">
          {teachers.map(([teacherId, name]) => (
            <div key={teacherId} className="flex items-center gap-2">
              <Checkbox id={`teacher-${teacherId}`} name="teachers" value={teacherId} defaultChecked={selected.has(teacherId)} />
              <Label htmlFor={`teacher-${teacherId}`}>{name}</Label>
            </div>
          ))}
        </Fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/departments" />
    </form>
  );
}
