"use client";

import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" color="red" disabled={pending} aria-busy={pending}>
      {pending ? "Excluindo…" : "Excluir"}
    </Button>
  );
}

/**
 * Confirmation modal in place of Django's <resource>_delete.html page. `action` is a bound Server Action;
 * `note` says what else happens (a payment's amount goes back to its installment…).
 */
export function DeleteButton({ action, label, note }: { action: () => Promise<void>; label: string; note?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Quiet until pointed at: on a list of 25 rows, 25 red buttons outweigh editing */}
      <Button
        size="xs"
        color="alternative"
        className="px-2 text-gray-500 hover:bg-red-50 hover:text-red-700 focus:text-red-700"
        onClick={() => setOpen(true)}
        aria-label={`Excluir ${label}`}
        data-tip="Excluir"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          delete
        </span>
      </Button>
      <Modal show={open} size="md" dismissible onClose={() => setOpen(false)}>
        <ModalHeader>Excluir {label}?</ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-700">{note ? `${note} ` : ""}Não é possível desfazer.</p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button color="alternative" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <form action={action}>
            <Confirm />
          </form>
        </ModalFooter>
      </Modal>
    </>
  );
}
