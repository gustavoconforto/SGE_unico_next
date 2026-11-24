"use client";

import { startTransition, useActionState, useState } from "react";
import {
  CheckOption,
  FieldMessage,
  Fieldset,
  FormButtons,
  FormFields,
  SelectField,
  TextField,
} from "@/components/form-fields";
import { GRADE_LEVELS } from "@/lib/grades";
import { saveLevelSubject } from "./actions";

type Props = {
  id?: number | null;
  defaults?: Record<string, unknown>;
  teacherIds?: number[];
  subjects: { id: number; name: string; departmentId: number | null }[];
  /** Department id → its teachers. */
  teachersByDepartment: Record<number, [number, string][]>;
};

export function LevelSubjectForm({ id = null, defaults, teacherIds = [], subjects, teachersByDepartment }: Props) {
  const [state, action, pending] = useActionState(saveLevelSubject.bind(null, id), {});
  const [subjectId, setSubjectId] = useState(String(defaults?.subjectId ?? ""));
  const [checked, setChecked] = useState<number[]>(teacherIds);
  const s = subjects.find((x) => String(x.id) === subjectId);
  const teachers = s?.departmentId ? (teachersByDepartment[s.departmentId] ?? []) : [];
  const help = !s
    ? "Selecione a matéria para ver os professores."
    : !s.departmentId
      ? `A matéria ${s.name} não está vinculada a um departamento.`
      : "Professores do departamento da matéria.";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <SelectField name="gradeLevel" label="Série" options={GRADE_LEVELS} />
        <SelectField
          name="subjectId"
          label="Matéria"
          options={subjects.map((x) => [x.id, x.name] as const)}
          value={subjectId}
          onChange={setSubjectId}
        />
        <Fieldset legend="Professores (opcional)" description={help}>
          {teachers.map(([tid, name]) => (
            <CheckOption
              key={tid}
              id={`teacher-${tid}`}
              name="teachers"
              value={tid}
              label={name}
              checked={checked.includes(tid)}
              onChange={(e) => setChecked((all) => (e.target.checked ? [...all, tid] : all.filter((x) => x !== tid)))}
            />
          ))}
          <div className="sm:col-span-2">
            <FieldMessage name="teachers" error={state.errors?.teachers?.[0]} />
          </div>
        </Fieldset>
        <TextField
          name="weeklyClasses"
          label="Aulas por semana"
          type="number"
          step="0.01"
          optional
          help="Média semanal; aceita frações (ex.: 1,5)"
        />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/grades/level-subjects" />
    </form>
  );
}
