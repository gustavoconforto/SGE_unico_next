"use client";

import { maskCpf } from "@/lib/format";
import { SEX_CHOICES, UFS } from "@/lib/person";
import { Fieldset, SelectField, TextField } from "./form-fields";

/**
 * The base.models.Person fields, grouped like the Django tabs. Extra fields go in the slots; `afterPersonal` is a whole
 * section placed right after Dados pessoais; `mobileAction` sits under Celular (the WhatsApp link).
 */
export function PersonFields({
  personal,
  documents,
  afterPersonal,
  mobileAction,
}: {
  personal?: React.ReactNode;
  documents?: React.ReactNode;
  afterPersonal?: React.ReactNode;
  mobileAction?: React.ReactNode;
}) {
  return (
    <>
      <Fieldset legend="Dados pessoais">
        <TextField
          name="name"
          label="Nome civil"
          maxLength={200}
          autoComplete="off"
          className="sm:col-span-2"
        />
        <SelectField name="sex" label="Sexo" options={SEX_CHOICES} optional />
        <TextField
          name="birthDate"
          label="Data de nascimento"
          type="date"
          optional
        />
        <TextField
          name="nationality"
          label="Nacionalidade"
          maxLength={50}
          optional
        />
        <TextField
          name="placeOfBirth"
          label="Naturalidade"
          maxLength={50}
          optional
        />
        {personal}
      </Fieldset>
      {afterPersonal}
      <Fieldset legend="Documentos">
        <TextField
          name="cpf"
          label="CPF"
          mask={maskCpf}
          inputMode="numeric"
          placeholder="000.000.000-00"
          autoComplete="off"
        />
        <TextField name="rg" label="RG" maxLength={20} />
        <TextField
          name="issuingAuthority"
          label="Órgão expedidor"
          maxLength={20}
        />
        {documents}
      </Fieldset>
      <Fieldset legend="Contato">
        <TextField
          name="phone"
          label="Telefone"
          inputMode="tel"
          placeholder="(00) 0000-0000"
          optional
        />
        <div>
          <TextField
            name="mobile"
            label="Celular"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            optional
          />
          {mobileAction}
        </div>
        <TextField
          name="email"
          label="E-mail"
          type="email"
          maxLength={254}
          optional
          autoComplete="off"
          className="sm:col-span-2"
        />
      </Fieldset>
      <Fieldset legend="Endereço">
        <TextField
          name="address"
          label="Endereço"
          maxLength={200}
          optional
          className="sm:col-span-2"
        />
        <TextField
          name="neighborhood"
          label="Bairro"
          maxLength={100}
          optional
        />
        <TextField name="city" label="Cidade" maxLength={100} optional />
        <SelectField
          name="state"
          label="UF"
          options={UFS}
          optional
          emptyLabel="—"
        />
        <TextField
          name="zipCode"
          label="CEP"
          maxLength={9}
          inputMode="numeric"
          placeholder="00000000"
          optional
        />
      </Fieldset>
    </>
  );
}
