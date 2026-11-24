"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { saveClass } from "./actions";

type Options = [number, string][];

export function ClassForm(props: {
  id?: number | null;
  defaults?: Record<string, unknown>;
  programs: Options;
  years: Options;
}) {
  const [state, action, pending] = useActionState(saveClass.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={props.defaults}>
        <SelectField name="programId" label="Curso" options={props.programs} />
        <SelectField name="yearId" label="Ano letivo" options={props.years} />
        <TextField name="gradeLevel" label="Série" type="number" optional />
        <TextField name="name" label="Nome" maxLength={30} />
        <TextField name="capacity" label="Vagas" type="number" optional />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/classes" />
    </form>
  );
}
