"use client";

import { useActionState } from "react";
import {
  CheckOption,
  FieldMessage,
  Fieldset,
  FormButtons,
  FormFields,
  SelectField,
  TextField,
} from "@/components/form-fields";
import { WEEKDAYS } from "@/lib/lessons";
import { saveOffering } from "./actions";

type Options = [number, string][];
type Props = {
  id?: number | null;
  defaults?: Record<string, unknown>;
  weekdays?: number[];
  teacherIds?: number[];
  pathways: Options;
  years: Options;
  teachers: Options;
};

export function OfferingForm({
  id = null,
  defaults,
  weekdays = [],
  teacherIds = [],
  pathways,
  years,
  teachers,
}: Props) {
  const [state, action, pending] = useActionState(saveOffering.bind(null, id), {});
  // After a failed submit the ticked boxes come back as CSV
  const ticked = (name: string, saved: number[]) =>
    new Set(state.values ? (state.values[name] ?? "").split(",").filter(Boolean).map(Number) : saved);
  const days = ticked("weekdays", weekdays);
  const chosen = ticked("teachers", teacherIds);
  const boxes = (name: string, options: readonly (readonly [number, string])[], set: Set<number>) =>
    options.map(([v, l]) => (
      <CheckOption
        key={`${name}-${v}-${set.has(v)}`}
        id={`${name}-${v}`}
        name={name}
        value={v}
        defaultChecked={set.has(v)}
        label={l}
      />
    ));
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <Fieldset legend="Turma de itinerário">
          <SelectField name="pathwayId" label="Itinerário" options={pathways} />
          <SelectField name="schoolYearId" label="Ano escolar" options={years} />
          <TextField name="name" label="Turma" maxLength={30} optional help="Ex.: Manhã, Grupo A" />
          <TextField name="schedule" label="Horário" maxLength={100} optional help="Ex.: Terças, 14h às 15h40" />
          <TextField name="capacity" label="Vagas" type="number" optional />
        </Fieldset>
        <Fieldset
          legend="Dias de aula (opcional)"
          description="Dias da semana em que há aula; montam as datas do diário."
        >
          {boxes("weekdays", WEEKDAYS, days)}
          <div className="sm:col-span-2">
            <FieldMessage name="weekdays" error={state.errors?.weekdays?.[0]} />
          </div>
        </Fieldset>
        <Fieldset legend="Professores (opcional)">{boxes("teachers", teachers, chosen)}</Fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/pathways/offerings" />
    </form>
  );
}
