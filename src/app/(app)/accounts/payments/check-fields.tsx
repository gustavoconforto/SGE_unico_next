"use client";

import { useState } from "react";
import { Fieldset, TextField } from "@/components/form-fields";
import { looksLikeCmc7, parseCmc7 } from "@/lib/cmc7";
import { maskCpf } from "@/lib/format";

/**
 * The payer's cheque (not in Django): the whole CMC-7 line typed or scanned into Número do cheque fills número,
 * banco, agência and conta. Parsed by `checkSchema` in actions.ts. `optional`: a cheque payment saved before this
 * screen asked for them may stay blank.
 */
export function CheckFields({ defaults = {}, optional }: { defaults?: Record<string, unknown>; optional?: boolean }) {
  const [check, setCheck] = useState(() => ({
    checkNumber: String(defaults.checkNumber ?? ""),
    checkBank: String(defaults.checkBank ?? ""),
    checkBranch: String(defaults.checkBranch ?? ""),
    checkAccount: String(defaults.checkAccount ?? ""),
  }));
  const set = (name: keyof typeof check) => (v: string) => setCheck((c) => ({ ...c, [name]: v }));
  function typeNumber(v: string) {
    const cmc7 = parseCmc7(v);
    setCheck((c) =>
      cmc7
        ? { checkNumber: cmc7.number, checkBank: cmc7.bank, checkBranch: cmc7.branch, checkAccount: cmc7.account }
        : { ...c, checkNumber: v },
    );
  }

  return (
    <Fieldset legend="Dados do cheque">
      <TextField
        name="checkNumber"
        optional={optional}
        label="Número do cheque"
        inputMode="numeric"
        autoComplete="off"
        value={check.checkNumber}
        // Digits only: a reader's end symbol typed after the split must not stick to the number
        onChange={(v) => typeNumber(v.replace(/\D/g, ""))}
        help={
          looksLikeCmc7(check.checkNumber)
            ? "Código não confere: verifique os dígitos da linha de baixo do cheque"
            : "Digite (ou leia com a leitora) todos os números da linha de baixo do cheque: banco, agência e conta se preenchem sozinhos"
        }
      />
      <TextField
        name="checkDate"
        label="Bom para"
        type="date"
        optional
        help="Só para cheque pré-datado: a data em que pode ser depositado"
      />
      <TextField
        name="checkBank"
        optional={optional}
        label="Banco"
        maxLength={3}
        inputMode="numeric"
        placeholder="000"
        value={check.checkBank}
        onChange={set("checkBank")}
      />
      <TextField
        name="checkBranch"
        optional={optional}
        label="Agência"
        maxLength={10}
        inputMode="numeric"
        value={check.checkBranch}
        onChange={set("checkBranch")}
      />
      <TextField
        name="checkAccount"
        optional={optional}
        label="Conta"
        maxLength={20}
        value={check.checkAccount}
        onChange={set("checkAccount")}
      />
      <TextField name="checkHolderName" label="Nome do titular" maxLength={200} optional={optional} />
      <TextField
        name="checkHolderCpf"
        optional={optional}
        label="CPF do titular"
        mask={maskCpf}
        inputMode="numeric"
        placeholder="000.000.000-00"
        autoComplete="off"
      />
    </Fieldset>
  );
}
