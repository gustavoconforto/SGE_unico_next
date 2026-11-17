"use client";

import { Alert, Button, Label, TextInput } from "flowbite-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const { error } = await authClient.signIn.username({
      username: String(form.get("username")).trim().toLowerCase(),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError("Usuário ou senha inválidos.");
    // Only same-site paths: "//host" and "/\host" resolve to another site (open redirect)
    const target = new URL(next, location.origin);
    router.replace(target.origin === location.origin ? target.pathname + target.search + target.hash : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <Alert color="failure">{error}</Alert>}
      <div>
        <Label htmlFor="username">Usuário</Label>
        <TextInput id="username" name="username" placeholder="seu.usuario" autoComplete="username" required autoFocus />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <TextInput id="password" name="password" type="password" placeholder="senha" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
