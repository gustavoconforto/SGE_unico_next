"use client";

import { Checkbox, Label, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { useActionState } from "react";
import { Fieldset, FormButtons, FormFields, SelectField } from "@/components/form-fields";
import { ENROLLMENT_STATUSES } from "@/lib/finance";
import { updateEnrollment } from "./actions";

type Props = {
  id: number;
  /** Shown as text: [label, value]. */
  locked: [string, string][];
  defaults: Record<string, unknown>;
  classes: [number, string][];
  documents: { id: number; type: string; isDelivered: boolean }[];
};

/** Only class, status and documents change; contract, date and due day are shown as text (the account was generated from them). */
export function EnrollmentEditForm({ id, locked, defaults, classes, documents }: Props) {
  const [state, action, pending] = useActionState(updateEnrollment.bind(null, id), {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <Fieldset legend="Matrícula" description="Contrato, data e vencimento não mudam: a conta e as parcelas já foram geradas a partir deles.">
          {/* Plain text, not disabled inputs: full contrast, and nothing that looks editable but isn't */}
          <dl className="grid gap-x-4 gap-y-3 text-sm sm:col-span-2 sm:grid-cols-3">
            {locked.map(([term, value]) => (
              <div key={term}>
                <dt className="text-gray-600">{term}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          <SelectField name="schoolClassId" label="Turma" options={classes} optional />
          <SelectField name="status" label="Situação" options={ENROLLMENT_STATUSES} />
        </Fieldset>
        <Fieldset legend="Documentos" description="Marque o que o responsável já entregou.">
          <div className="sm:col-span-2">
            {documents.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum documento vinculado a esta matrícula.</p>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Documento</TableHeadCell>
                    <TableHeadCell className="w-32 text-center">Entregue</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Label htmlFor={`doc-${d.id}`}>{d.type}</Label>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox id={`doc-${d.id}`} name="delivered" value={d.id} defaultChecked={d.isDelivered} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/enrollments" label="Salvar turma, situação e documentos" />
    </form>
  );
}
