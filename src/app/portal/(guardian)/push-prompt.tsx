"use client";

import { Button } from "flowbite-react";
import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "../actions";

/** Where the portal's service worker lives; its scope is the portal only, never the staff system. */
export const PORTAL_SW = "/portal/sw.js";

type State = "loading" | "unsupported" | "install-ios" | "off" | "on" | "denied";

// iOS offers push only to a web app added to the Home Screen; iPadOS reports itself as a Mac with touch
const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

// VAPID keys are URL-safe base64; PushManager wants the raw bytes
function keyBytes(base64: string) {
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentState(): Promise<State> {
  if (!("serviceWorker" in navigator && "PushManager" in window))
    return isIos() && !isInstalled() ? "install-ios" : "unsupported";
  try {
    const registration = await navigator.serviceWorker.register(PORTAL_SW, {
      scope: "/portal",
      updateViaCache: "none",
    });
    if (await registration.pushManager.getSubscription()) return "on";
    return Notification.permission === "denied" ? "denied" : "off";
  } catch {
    return "unsupported";
  }
}

/**
 * Turns on this phone's notifications for school notices; on an iPhone, first explains installing the app.
 * Permission is asked only from the tap: iOS refuses a prompt that no user gesture started.
 */
export function PushPrompt({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void currentState().then(setState);
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      await savePushSubscription(sub.toJSON());
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;
  if (state === "install-ios")
    return (
      <p className="text-gray-700">
        Para receber os avisos no iPhone, instale o portal: toque em{" "}
        <span className="material-symbols-outlined align-middle text-gray-500" aria-hidden>
          ios_share
        </span>{" "}
        <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>. Abra o portal pelo novo
        ícone e ative as notificações.
      </p>
    );
  if (state === "denied")
    return (
      <p className="text-gray-700">
        As notificações estão bloqueadas neste aparelho. Para receber os avisos, permita as notificações do portal nos
        ajustes do celular.
      </p>
    );
  if (state === "on")
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-gray-700">Você recebe os avisos da escola neste aparelho.</p>
        <Button color="alternative" size="sm" onClick={turnOff} disabled={busy}>
          Desativar
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-gray-700">Receba os avisos da escola como notificação neste aparelho.</p>
      <Button onClick={turnOn} disabled={busy} className="w-full sm:w-fit">
        {busy ? "Ativando…" : "Ativar notificações"}
      </Button>
    </div>
  );
}
