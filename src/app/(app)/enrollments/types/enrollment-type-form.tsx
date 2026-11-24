"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { LEVELS } from "@/lib/finance";
import { saveEnrollmentType } from "./actions";

type Options = [number, string][];

export function EnrollmentTypeForm(props: {
  id?: number | null;
  defaults?: Record<string, unknown>;
  programs: Options;
  years: Options;
}) {
  const [state, action, pending] = useActionState(saveEnrollmentType.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={props.defaults ?? { punctualityDiscount: "90.00" }}>
        <SelectField name="programId" label="Curso" options={props.programs} />
        <SelectField name="level" label="Série" options={LEVELS} optional />
        <SelectField name="schoolYearId" label="Ano escolar" options={props.years} />
        <TextField name="totalPrice" label="Valor total" type="number" step="0.01" />
        <TextField
          name="punctualityDiscount"
          label="Desconto de pontualidade"
          type="number"
          step="0.01"
          help="Abatido de cada parcela paga por boleto até o vencimento"
        />
        <TextField name="description" label="Descrição" optional />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/enrollments/types" />
    </form>
  );
}
