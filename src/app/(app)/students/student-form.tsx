"use client";

import { FileInput } from "flowbite-react";
import { startTransition, useActionState } from "react";
import {
  CheckboxField,
  FieldLabel,
  FieldMessage,
  Fieldset,
  FormButtons,
  FormFields,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/form-fields";
import { PersonFields } from "@/components/person-fields";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatPhone } from "@/lib/person";
import { BLOOD_TYPES, type GuardianRow } from "@/lib/students";
import { saveStudent } from "./actions";
import { type GuardianOption, GuardianRows } from "./guardian-rows";

type Props = {
  id?: number | null;
  defaults?: Record<string, unknown>;
  photoUrl?: string;
  guardianRows?: GuardianRow[];
  guardianOptions: GuardianOption[];
};

export function StudentForm({
  id = null,
  defaults,
  photoUrl,
  guardianRows = [],
  guardianOptions,
}: Props) {
  const [state, action, pending] = useActionState(
    saveStudent.bind(null, id),
    {},
  );
  const shown = defaults && {
    ...defaults,
    phone: formatPhone(defaults.phone as string),
    mobile: formatPhone(defaults.mobile as string),
  };
  const photoError = state.errors?.photo?.[0];

  // Submitted by hand so React doesn't reset the form: the guardian rows live in component state.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={shown}>
        {id === null && (
          <p className="text-sm text-gray-700">
            Antes de começar, tenha em mãos o CPF, o RG (com o órgão expedidor)
            e o tipo sanguíneo do aluno: sem eles o cadastro não é salvo.
          </p>
        )}
        {/* Name first: it's what staff type first, and where focus lands on a failed submit */}
        <Fieldset legend="Foto e matrícula">
          <div className="flex items-center gap-4 sm:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated /media route */}
            <img
              src={photoUrl ?? "/img/student-placeholder.svg"}
              alt="Foto do aluno"
              className="size-24 rounded-lg border border-gray-200 object-cover"
            />
            <div>
              <FieldLabel htmlFor="photo" label="Foto" optional />
              <FileInput
                id="photo"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                color={photoError ? "failure" : undefined}
                aria-invalid={!!photoError}
                aria-describedby={photoError ? "photo-error" : "photo-help"}
              />
              <FieldMessage
                name="photo"
                error={photoError}
                help="JPG, PNG ou WebP"
              />
            </div>
          </div>
          {typeof defaults?.registration === "string" && (
            <p className="text-sm sm:col-span-2">
              Matrícula: <strong>{defaults.registration}</strong>
            </p>
          )}
        </Fieldset>
        <PersonFields
          // Saved students only, like the guardians' links; it follows the number as it is edited
          mobileAction={id ? <WhatsAppLink field="mobile" phone={defaults?.mobile as string} /> : undefined}
          personal={
            <>
              <TextField
                name="socialName"
                label="Nome social"
                maxLength={200}
                optional
              />
              <div className="flex items-end">
                <CheckboxField name="useSocialName" label="Usar nome social" />
              </div>
              <SelectField
                name="bloodType"
                label="Tipo sanguíneo"
                options={BLOOD_TYPES}
              />
            </>
          }
          afterPersonal={
            // Required, and the one most often blocking a save: right after who the student is
            <GuardianRows
              initial={guardianRows}
              options={guardianOptions}
              showWhatsapp={!!id}
            >
              <CheckboxField
                name="isSelfFinancial"
                label="O próprio aluno é o responsável financeiro"
              />
            </GuardianRows>
          }
        />
        <Fieldset legend="Vida escolar">
          <TextField
            name="schoolFrom"
            label="Escola de origem"
            maxLength={200}
            optional
            className="sm:col-span-2"
          />
          <TextareaField
            name="observations"
            label="Observações pedagógicas"
            optional
            className="sm:col-span-2"
          />
        </Fieldset>

      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/students"
        label={id ? "Salvar alterações" : "Cadastrar aluno"}
        sticky
      />
    </form>
  );
}
