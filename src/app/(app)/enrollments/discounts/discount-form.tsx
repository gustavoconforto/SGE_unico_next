"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveDiscountType } from "./actions";

export function DiscountTypeForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveDiscountType.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="description" label="Descrição" maxLength={200} />
        <TextField name="percentage" label="Percentual" type="number" step="0.01" help="Entre 0 e 100" />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/enrollments/discounts" />
    </form>
  );
}
