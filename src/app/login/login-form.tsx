"use client";

import { Alert, Button, Label, TextInput } from "flowbite-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// 16px on phones so iOS Safari doesn't zoom in on focus
const inputTheme = { field: { input: { sizes: { md: "p-2.5 text-base sm:text-sm" } } } };

// Only a 401 is the user's fault; a rate limit or an outage must not read as a wrong password
function errorMessage(status: number | undefined) {
  if (status === 401) return "Usuário ou senha incorretos.";
  if (status === 429) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";
  const [error, setError] = useState<{ status?: number } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      const { error } = await authClient.signIn.username({
        username: String(form.get("username")).trim().toLowerCase(),
        password: String(form.get("password")),
      });
      if (error) return setError({ status: error.status });
    } catch {
      return setError({});
    } finally {
      setPending(false);
    }
    // Only same-site paths: "//host" and "/\host" resolve to another site (open redirect)
    const target = new URL(next, location.origin);
    router.replace(target.origin === location.origin ? target.pathname + target.search + target.hash : "/");
    router.refresh();
  }

  const invalid = error?.status === 401;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="username">Usuário</Label>
        <TextInput
          id="username"
          name="username"
          placeholder="seu.usuario"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
          aria-invalid={invalid}
          color={invalid ? "failure" : "gray"}
          theme={inputTheme}
        />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={invalid}
          color={invalid ? "failure" : "gray"}
          theme={inputTheme}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      {/* Below the button so it doesn't push the fields; cleared on submit so a repeated failure is announced again */}
      {error && <Alert color="failure">{errorMessage(error.status)}</Alert>}
    </form>
  );
}
