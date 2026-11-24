"use client";

import { Alert, Button, Checkbox, HelperText, Label, Select, TextInput, Textarea } from "flowbite-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/form";

// Fields read their error and value from the nearest <FormFields>, so forms don't thread props.
// `fixed`: fields edited since the failed submit, whose server error no longer describes them
type Ctx = {
  state: FormState;
  defaults: Record<string, unknown>;
  fixed: Set<string>;
  markFixed: (name: string) => void;
};
const FormContext = createContext<Ctx>({ state: {}, defaults: {}, fixed: new Set(), markFixed: () => {} });

const EMPTY = new Set<string>();

/** `note` adds to the "required fields" line, so a form opens with one instruction, not a stack of them. */
export function FormFields({
  state,
  defaults = {},
  note,
  children,
}: {
  state: FormState;
  defaults?: Record<string, unknown>;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  const noteRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  // Tied to the state it was collected for, so the next submit's errors start fresh
  const [edited, setEdited] = useState<{ for: FormState; names: Set<string> }>({ for: state, names: new Set() });
  const fixed = edited.for === state ? edited.names : EMPTY;
  const markFixed = useCallback(
    (name: string) => {
      if (state.errors?.[name]?.length)
        setEdited((e) => ({ for: state, names: new Set(e.for === state ? e.names : []).add(name) }));
    },
    [state],
  );
  const errorCount = Object.entries(state.errors ?? {}).filter(([name, e]) => e?.length && !fixed.has(name)).length;
  // One field error is already focused and shown in place; a summary only helps when there are several
  const showSummary = !!state.formError || errorCount > 1;

  // Required fields keep `required` for screen readers, but the server owns validation: the browser's
  // one-at-a-time bubbles would hide the inline errors. Set after hydration so a no-JS submit still validates.
  useEffect(() => {
    noteRef.current?.closest("form")?.setAttribute("novalidate", "");
  }, []);

  // Typing in (or picking for) a field with an error clears it; the server checks again on submit
  useEffect(() => {
    const form = noteRef.current?.closest("form");
    const onEdit = (e: Event) => {
      const name = (e.target as HTMLInputElement).name;
      if (name) markFixed(name);
    };
    form?.addEventListener("input", onEdit);
    form?.addEventListener("change", onEdit);
    return () => {
      form?.removeEventListener("input", onEdit);
      form?.removeEventListener("change", onEdit);
    };
  }, [markFixed]);

  // After a failed submit, take the user to the first problem
  useEffect(() => {
    const form = noteRef.current?.closest("form");
    const first = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (first) first.focus();
    else if (state.formError) summaryRef.current?.focus();
  }, [state]);

  // The summary names the fields to fix, read from the rendered form: the server only knows field names, not labels
  const [invalidFields, setInvalidFields] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    const form = noteRef.current?.closest("form");
    const fields = [...(form?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? [])].map((el) => ({
      id: el.id,
      label: fieldLabel(el),
    }));
    setInvalidFields(fields.filter((f) => f.id && f.label));
  }, [state, fixed]);

  return (
    <FormContext.Provider value={{ state, defaults, fixed, markFixed }}>
      <p ref={noteRef} className="required-note text-sm text-gray-600">
        Campos sem “opcional” são obrigatórios.{note && <> {note}</>}
      </p>
      {showSummary && (
        // Flowbite's Alert carries role="alert"; the wrapper only takes focus
        <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
          <Alert color="failure">
            {state.formError}
            {state.formError && errorCount > 0 && " "}
            {errorCount > 0 &&
              (errorCount === 1
                ? "Corrija também o campo destacado abaixo."
                : `Corrija os ${errorCount} campos destacados abaixo:`)}
            {errorCount > 1 && invalidFields.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {invalidFields.map((f) => (
                  <li key={f.id}>
                    <a
                      href={`#${f.id}`}
                      onClick={(e) => (e.preventDefault(), document.getElementById(f.id)?.focus())}
                      className="font-medium underline underline-offset-2"
                    >
                      {f.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        </div>
      )}
      {children}
    </FormContext.Provider>
  );
}

/** A field's visible label, without the "(opcional)" note; its aria-label when it has no <label>. */
function fieldLabel(el: HTMLElement): string {
  const label = (el as HTMLInputElement).labels?.[0];
  if (!label) return el.getAttribute("aria-label") ?? "";
  const copy = label.cloneNode(true) as HTMLElement;
  copy.querySelector(".field-optional")?.remove();
  return copy.textContent?.trim() ?? "";
}

/** For fields with no named input of their own (comboboxes, guardian rows): clears the field's error on edit. */
export const useMarkFixed = () => useContext(FormContext).markFixed;

/** A controlled field the form fills in by itself (amount from the installment, guardian from the student) fires no input event: clear its error when its value changes. */
export function useFixWhenSet(name: string | undefined, value: string | undefined) {
  const markFixed = useMarkFixed();
  const prev = useRef(value);
  useEffect(() => {
    if (value === prev.current) return;
    prev.current = value;
    if (name) markFixed(name);
  }, [name, value, markFixed]);
}

/** Value, error and ARIA wiring of one field; `help` is linked when no error replaces it. */
export function useField(name: string, help?: string) {
  const { state, defaults, fixed } = useContext(FormContext);
  const error = fixed.has(name) ? undefined : state.errors?.[name]?.[0];
  // After a failed submit, show what was typed; otherwise the saved value.
  const submitted = state.values !== undefined;
  // Disabled fields aren't submitted, so they keep their saved value
  const raw = submitted && state.values && name in state.values ? state.values[name] : defaults[name];
  return {
    error,
    value: raw == null ? "" : String(raw),
    checked: submitted ? state.values?.[name] === "on" : defaults[name] === true,
    a11y: { "aria-invalid": !!error, "aria-describedby": error ? `${name}-error` : help ? `${name}-help` : undefined },
  };
}

type Base = { name: string; label: React.ReactNode; optional?: boolean; className?: string };

export function FieldLabel({
  htmlFor,
  label,
  optional,
}: {
  htmlFor: string;
  label: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 block">
      {/* The space sits inside the span so the accessible name never reads "(R$)(opcional)" */}
      {label}
      {optional && <span className="field-optional font-normal text-gray-600">{" (opcional)"}</span>}
    </Label>
  );
}

/** Error (or help) line under a field; the id is what the input's aria-describedby points to. */
export function FieldMessage({ name, error, help }: { name: string; error?: string; help?: string }) {
  if (error)
    return (
      <HelperText id={`${name}-error`} color="failure">
        {error}
      </HelperText>
    );
  return help ? (
    <HelperText id={`${name}-help`} className="text-gray-600">
      {help}
    </HelperText>
  ) : null;
}

function Wrapper({
  name,
  label,
  optional,
  className,
  error,
  help,
  children,
}: Base & { error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={name} label={label} optional={optional} />
      {children}
      <FieldMessage name={name} error={error} help={help} />
    </div>
  );
}

type Controlled = { value: string; onChange: (value: string) => void };

export function TextField(
  props: Base & {
    type?: string;
    maxLength?: number;
    inputMode?: "tel" | "numeric" | "decimal";
    placeholder?: string;
    step?: string;
    min?: number;
    max?: number;
    disabled?: boolean;
    help?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    /** Display format applied to the saved value and as the user types (e.g. `maskCpf`); the server still parses it. */
    mask?: (value: string) => string;
  } & Partial<Controlled>,
) {
  const { error, value, a11y } = useField(props.name, props.help);
  useFixWhenSet(props.name, props.value);
  // Decimal fields are text so pt-BR keyboards can type a comma; the server parses "1234,56".
  const decimal = props.type === "number" && props.step?.includes(".");
  const control = props.onChange
    ? {
        value: props.value ?? "",
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange!(e.target.value),
      }
    : { defaultValue: props.mask ? props.mask(value) : value, onInput: props.mask && applyMask(props.mask) };
  return (
    <Wrapper {...props} error={error}>
      <TextInput
        id={props.name}
        name={props.name}
        type={decimal ? "text" : (props.type ?? "text")}
        inputMode={decimal ? "decimal" : props.inputMode}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        step={decimal ? undefined : props.step}
        min={props.min}
        max={props.max}
        disabled={props.disabled}
        required={!props.optional && !props.disabled}
        autoComplete={props.autoComplete}
        autoFocus={props.autoFocus}
        className={decimal || props.mask ? "tabular-nums" : undefined}
        color={error ? "failure" : undefined}
        {...control}
        {...a11y}
      />
    </Wrapper>
  );
}

/** Reformats an uncontrolled input on each keystroke, keeping the caret after the same number of digits. */
function applyMask(mask: (value: string) => string) {
  return (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, "").length;
    const masked = mask(input.value);
    if (masked === input.value) return;
    input.value = masked;
    let pos = 0;
    for (let seen = 0; pos < masked.length && seen < digitsBefore; pos++) if (/\d/.test(masked[pos])) seen++;
    input.setSelectionRange(pos, pos);
  };
}

export function TextareaField(props: Base & { rows?: number; help?: string }) {
  const { error, value, a11y } = useField(props.name, props.help);
  return (
    <Wrapper {...props} error={error}>
      <Textarea
        id={props.name}
        name={props.name}
        rows={props.rows ?? 4}
        defaultValue={value}
        required={!props.optional}
        color={error ? "failure" : undefined}
        {...a11y}
      />
    </Wrapper>
  );
}

export function SelectField(
  props: Base & {
    options: readonly (readonly [string | number, string])[];
    disabled?: boolean;
    help?: string;
    emptyLabel?: string;
  } & Partial<Controlled>,
) {
  const { error, value, a11y } = useField(props.name, props.help);
  useFixWhenSet(props.name, props.value);
  const control = props.onChange
    ? {
        value: props.value ?? "",
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => props.onChange!(e.target.value),
      }
    : { defaultValue: value };
  return (
    <Wrapper {...props} error={error}>
      {/* key: React won't re-apply a changed defaultValue on <select> after a failed submit */}
      <Select
        key={props.onChange ? undefined : value}
        id={props.name}
        name={props.name}
        disabled={props.disabled}
        required={!props.optional && !props.disabled}
        color={error ? "failure" : undefined}
        {...control}
        {...a11y}
      >
        <option value="">{props.emptyLabel ?? (props.optional ? "Nenhum" : "Selecione…")}</option>
        {props.options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
    </Wrapper>
  );
}

/** One checkbox whose whole line (box + text) is the click target. */
export function CheckOption({
  id,
  label,
  ...box
}: { id: string; label: React.ReactNode } & React.ComponentProps<typeof Checkbox>) {
  return (
    <label
      htmlFor={id}
      className="-mx-1 flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-1 text-sm font-medium text-gray-900 hover:bg-gray-100 has-disabled:cursor-default has-disabled:hover:bg-transparent"
    >
      <Checkbox id={id} {...box} />
      <span>{label}</span>
    </label>
  );
}

export function CheckboxField({ name, label, help }: { name: string; label: string; help?: string }) {
  const { checked, error, a11y } = useField(name, help);
  return (
    <div>
      <CheckOption id={name} name={name} label={label} defaultChecked={checked} {...a11y} />
      <FieldMessage name={name} error={error} help={help} />
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-x-4 gap-y-5 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
      <legend className="px-1.5 text-base font-semibold text-gray-900">{legend}</legend>
      {description && <p className="-mt-2 text-sm text-gray-600 sm:col-span-2">{description}</p>}
      {children}
    </fieldset>
  );
}

export const DISCARD = "Sair sem salvar? As alterações deste formulário serão perdidas.";

/**
 * While `isDirty()`, leaving (reload, close, any link, the browser's Back) asks first; `onLeave` runs when
 * the user accepts. Back can't be cancelled, so `arm()` pushes a copy of this page to land on, and Back
 * then asks: staying pushes it again, leaving goes back once more.
 */
function guardLeave(isDirty: () => boolean, onLeave: () => void) {
  let armed = false;
  // shortcut: the copy stays in history after a save, so the first Back afterwards stays on the page; drop it if users notice
  const arm = () => {
    if (armed || !isDirty()) return;
    window.history.pushState(window.history.state, "");
    armed = true;
  };
  const onPop = () => {
    if (!armed) return;
    armed = false;
    if (isDirty() && !window.confirm(DISCARD)) return arm();
    onLeave();
    window.history.back();
  };
  const onUnload = (e: BeforeUnloadEvent) => {
    if (isDirty()) e.preventDefault();
  };
  // Capture on document runs before Next's <Link> handler, so a declined leave never navigates
  const onClick = (e: MouseEvent) => {
    const link = (e.target as Element | null)?.closest?.("a[href]");
    if (!isDirty() || !link || link.getAttribute("target") === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (!window.confirm(DISCARD)) {
      e.preventDefault();
      e.stopPropagation();
    } else onLeave();
  };
  window.addEventListener("beforeunload", onUnload);
  window.addEventListener("popstate", onPop);
  document.addEventListener("click", onClick, true);
  return {
    arm,
    stop: () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
    },
  };
}

/** Once the user edits the form, leaving it (reload, close, any link, Back) asks first. A save's redirect isn't a link click. */
function useUnsavedGuard(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let dirty = false;
    const guard = guardLeave(
      () => dirty,
      () => (dirty = false),
    );
    const onInput = () => {
      dirty = true;
      guard.arm();
    };
    form.addEventListener("input", onInput);
    return () => {
      form.removeEventListener("input", onInput);
      guard.stop();
    };
  }, [ref]);
}

/** The same guard for a form that tracks its own changes (the grade sheet). One guard for the form's life, so Back's copy is pushed once. */
export function useLeaveGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  const guardRef = useRef<ReturnType<typeof guardLeave>>(null);
  useEffect(() => {
    const guard = guardLeave(
      () => dirtyRef.current,
      () => (dirtyRef.current = false),
    );
    guardRef.current = guard;
    return () => {
      guard.stop();
      guardRef.current = null;
    };
  }, []);
  useEffect(() => {
    dirtyRef.current = dirty;
    if (dirty) guardRef.current?.arm();
  }, [dirty]);
}

/**
 * Submit + cancel. `label` names the action ("Registrar baixa"); long forms keep it in reach with `sticky`.
 * `another` (e.g. "Registrar e começar outro") adds a second submit for records typed in series; the action sees `next=another`.
 */
export function FormButtons({
  pending,
  cancelHref,
  label = "Salvar",
  sticky = false,
  another,
  note,
}: {
  pending: boolean;
  cancelHref: string;
  label?: string;
  sticky?: boolean;
  another?: string;
  /** A line above the buttons, e.g. a warning that sits off-screen on phones. */
  note?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useUnsavedGuard(ref);
  return (
    <div
      ref={ref}
      className={
        sticky
          ? "sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 lg:mx-0 lg:px-0"
          : "flex flex-wrap gap-2"
      }
    >
      {note && <div className="basis-full">{note}</div>}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Salvando…" : label}
      </Button>
      {another && (
        <Button type="submit" name="next" value="another" color="light" disabled={pending}>
          {another}
        </Button>
      )}
      {/* A text link, so the two secondary actions don't look alike */}
      <Link
        href={cancelHref}
        className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
      >
        Cancelar
      </Link>
    </div>
  );
}
