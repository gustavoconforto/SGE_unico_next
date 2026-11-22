"use client";

import { Toast, ToastToggle } from "flowbite-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

// Replaces Django's messages framework: actions redirect with ?msg=<key>.
// Keys are whitelisted so the URL can't inject arbitrary text.
const MESSAGES = {
  created: { text: "Registro cadastrado com sucesso", ok: true },
  updated: { text: "Registro atualizado com sucesso", ok: true },
  deleted: { text: "Registro excluído com sucesso", ok: true },
  password_changed: { text: "Senha alterada com sucesso", ok: true },
  protected: { text: "Este registro está em uso e não pode ser excluído.", ok: false },
  department_protected: { text: "Este departamento possui matérias e não pode ser excluído.", ok: false },
  supplier_protected: { text: "Este fornecedor possui contas e não pode ser excluído.", ok: false },
  category_protected: { text: "Esta categoria possui contas e não pode ser excluída.", ok: false },
  own_admin: { text: "Você não pode remover o seu próprio perfil de administrador.", ok: false },
  employee_has_login: { text: "Este funcionário tem acesso ao sistema: só outro administrador pode excluí-lo.", ok: false },
  account_has_payments: { text: "Esta conta possui baixas registradas. Exclua as baixas antes.", ok: false },
  account_in_use: { text: "Esta conta possui parcelas em uso (ex.: boletos) e não pode ser excluída.", ok: false },
  payment_created: { text: "Baixa registrada com sucesso", ok: true },
  payment_updated: { text: "Baixa atualizada com sucesso", ok: true },
  payments_created: { text: "Baixas registradas com sucesso", ok: true },
  payment_deleted: { text: "Baixa excluída. O valor voltou ao saldo da parcela.", ok: true },
  installment_created: { text: "Parcela cadastrada com sucesso", ok: true },
  student_created: { text: "Aluno cadastrado. Para matriculá-lo, use “Matricular” no topo da página.", ok: true },
  enrollment_created: { text: "Matrícula criada, com a conta e as parcelas. Confira os vencimentos nesta página.", ok: true },
  incident_type_protected: { text: "Este tipo de ocorrência possui ocorrências e não pode ser excluído.", ok: false },
  reason_protected: { text: "Este motivo possui liberações e não pode ser excluído.", ok: false },
  releases_created: { text: "Liberações registradas com sucesso", ok: true },
} as const;

export type FlashKey = keyof typeof MESSAGES;

export function Flash() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const key = searchParams.get("msg");
  const message = key && key in MESSAGES ? MESSAGES[key as FlashKey] : null;

  const dismiss = useCallback(() => {
    const rest = new URLSearchParams(searchParams);
    rest.delete("msg");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  // Errors stay until dismissed: they explain why something didn't happen
  useEffect(() => {
    if (!message?.ok) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, dismiss]);

  if (!message) return null;
  return (
    <div className="fixed right-4 bottom-4 z-50" role={message.ok ? "status" : "alert"}>
      <Toast>
        <span className={`material-symbols-outlined ${message.ok ? "text-green-600" : "text-red-600"}`} aria-hidden="true">
          {message.ok ? "check_circle" : "error"}
        </span>
        <div className="ml-3 text-sm font-normal">{message.text}</div>
        <ToastToggle onDismiss={dismiss} />
      </Toast>
    </div>
  );
}
