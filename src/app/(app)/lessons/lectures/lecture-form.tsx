"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { PERIODS } from "@/lib/lessons";
import { updateLecture } from "./actions";

type Options = [number, string][];

export function LectureForm(props: { id: number; defaults: Record<string, unknown>; classLabel: string; subjects: Options; teachers: Options }) {
  const [state, action, pending] = useActionState(updateLecture.bind(null, props.id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={{ ...props.defaults, classLabel: props.classLabel }}>
        <TextField name="classLabel" label="Turma" disabled />
        <TextField name="date" label="Data" type="date" />
        <SelectField name="period" label="Aula" options={PERIODS} />
        <SelectField name="subjectId" label="Matéria" options={props.subjects} />
        <SelectField name="teacherId" label="Professor" options={props.teachers} />
        <TextField name="topic" label="Conteúdo" maxLength={200} />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/lessons/lectures" />
    </form>
  );
}
