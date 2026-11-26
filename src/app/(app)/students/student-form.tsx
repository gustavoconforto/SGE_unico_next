"use client";

import { FileInput } from "flowbite-react";
import { startTransition, useActionState, useState } from "react";
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
import { CopyAddressButtons } from "@/components/copy-address";
import { PersonFields } from "@/components/person-fields";
import { PortalAccessFields } from "@/components/portal-access-fields";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatPhone } from "@/lib/person";
import { BLOOD_TYPES, type GuardianRow, STUDENT_PLACEHOLDER as PLACEHOLDER } from "@/lib/students";
import { saveStudent } from "./actions";
import { type GuardianOption, GuardianRows } from "./guardian-rows";

type Props = {
  id?: number | null;
  defaults?: Record<string, unknown>;
  photoUrl?: string;
  guardianRows?: GuardianRow[];
  guardianOptions: GuardianOption[];
};

export function StudentForm({ id = null, defaults, photoUrl, guardianRows = [], guardianOptions }: Props) {
  const [state, action, pending] = useActionState(saveStudent.bind(null, id), {});
  const shown = defaults && {
    ...defaults,
    phone: formatPhone(defaults.phone as string),
    mobile: formatPhone(defaults.mobile as string),
  };
  const photoError = state.errors?.photo?.[0];
  const [picked, setPicked] = useState<number[]>([]);

  // Submitted by hand so React doesn't reset the form: the guardian rows live in component state.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <FormFields
        state={state}
        defaults={shown}
        note={
          id === null &&
          "Tenha em mãos o CPF, o RG (com o órgão expedidor) e o tipo sanguíneo do aluno: sem eles o cadastro não é salvo."
        }
      >
        {/* Set by the action after a same-name warning: saving again with this name goes through */}
        <input type="hidden" name="duplicateOk" value={state.values?.duplicateOk ?? ""} />
        <Fieldset legend="Foto">
          <div className="flex items-center gap-4 sm:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated /media route */}
            <img
              src={photoUrl ?? PLACEHOLDER}
              // The placeholder silhouette says nothing to a screen reader
              alt={photoUrl && photoUrl !== PLACEHOLDER ? "Foto do aluno" : ""}
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
              <FieldMessage name="photo" error={photoError} help="JPG, PNG ou WebP" />
            </div>
          </div>
        </Fieldset>
        <PersonFields
          digitPhones
          autoFocusName={id === null}
          addressAction={<CopyAddressButtons sources={guardianOptions.filter((g) => picked.includes(g.id))} />}
          // Saved students only, like the guardians' links; it follows the number as it is edited
          mobileAction={id ? <WhatsAppLink field="mobile" phone={defaults?.mobile as string} /> : undefined}
          personal={
            <>
              <TextField name="socialName" label="Nome social" maxLength={200} optional />
              <div className="flex items-end">
                <CheckboxField name="useSocialName" label="Usar nome social" />
              </div>
              <SelectField name="bloodType" label="Tipo sanguíneo" options={BLOOD_TYPES} />
            </>
          }
          afterPersonal={
            // Required, and the one most often blocking a save: right after who the student is
            <GuardianRows initial={guardianRows} options={guardianOptions} showWhatsapp={!!id} onPick={setPicked}>
              <CheckboxField name="isSelfFinancial" label="O próprio aluno é o responsável financeiro" />
            </GuardianRows>
          }
        />
        <Fieldset legend="Vida escolar">
          <TextField name="schoolFrom" label="Escola de origem" maxLength={200} optional className="sm:col-span-2" />
          <TextareaField name="observations" label="Observações pedagógicas" optional className="sm:col-span-2" />
        </Fieldset>
        {id !== null && (
          <PortalAccessFields hasLogin={defaults?.access === true} username="a matrícula" who="do aluno" />
        )}
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref={id ? `/students/${id}` : "/students"}
        label={id ? "Salvar alterações" : "Cadastrar aluno"}
        another={id ? undefined : "Cadastrar e começar outro"}
        sticky
      />
    </form>
  );
}
