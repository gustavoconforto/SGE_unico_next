"use client";

import { useActionState } from "react";
import { CheckOption, Fieldset, FormButtons, FormFields, TextField } from "@/components/form-fields";
import { PERMISSIONS } from "@/lib/permissions";
import { saveGroup } from "./actions";

type Props = { id?: number | null; defaults?: { name: string }; roleIds?: number[]; codes?: string[]; roles: [number, string][] };

export function GroupForm({ id = null, defaults, roleIds = [], codes = [], roles }: Props) {
  const [state, action, pending] = useActionState(saveGroup.bind(null, id), {});
  // After a failed submit, keep what was ticked
  const pickedRoles = new Set(state.values ? state.values.roles.split(",").filter(Boolean).map(Number) : roleIds);
  const pickedCodes = new Set(state.values ? state.values.permissions.split(",").filter(Boolean) : codes);
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="name" label="Nome" maxLength={150} className="max-w-lg" />
        <Fieldset legend="Cargos (opcional)" description="Todo funcionário com um destes cargos recebe as permissões do grupo.">
          {roles.map(([roleId, name]) => (
            <CheckOption key={roleId} id={`role-${roleId}`} name="roles" value={roleId} label={name} defaultChecked={pickedRoles.has(roleId)} />
          ))}
        </Fieldset>
        <Fieldset legend="Permissões (opcional)" description="Sem “ver”, a tela some do menu e não abre. Administradores têm todas as permissões.">
          {PERMISSIONS.map(([code, label]) => (
            <CheckOption key={code} id={`perm-${code}`} name="permissions" value={code} label={label} defaultChecked={pickedCodes.has(code)} />
          ))}
        </Fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/groups" />
    </form>
  );
}
