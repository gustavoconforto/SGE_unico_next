"use client";

import { TextInput } from "flowbite-react";
import { useEffect, useId, useRef, useState } from "react";
import { FieldLabel, FieldMessage, useField, useFixWhenSet, useMarkFixed } from "./form-fields";

/** `hint`: a second line under the label (why a row matched, e.g. the guardian); `detail`: right-aligned; `badge`: a short status after the hint ("em atraso"). */
export type ComboOption = { value: string; label: string; hint?: string; detail?: string; badge?: string };

type Props = {
  /** Posted name; leave out when the parent serializes the value itself (guardian rows). */
  name?: string;
  id?: string;
  label: string;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
  help?: string;
  /** Id of more text that describes the chosen value (shown outside the field). */
  describedBy?: string;
  error?: string;
  placeholder?: string;
  /** Local list, filtered as the user types; [value, label] pairs work too, like <SelectField>. */
  options?: readonly (ComboOption | readonly [string | number, string])[];
  /** Or a server search (debounced). */
  search?: (query: string) => Promise<ComboOption[]>;
  /** The chosen option when it isn't in `options` (server search, edit forms). */
  initial?: ComboOption | null;
  /** Controlled value; without it the value comes from <FormFields> defaults. */
  value?: string;
  onChange?: (value: string, option: ComboOption | null) => void;
  emptyText?: string;
  autoFocus?: boolean;
};

const SHOWN = 50;
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Searchable select (WAI-ARIA combobox): type to filter, arrows to move, Enter to pick, Escape to close. */
export function Combobox(props: Props) {
  const autoId = useId();
  const id = props.id ?? props.name ?? autoId;
  const listId = `${id}-listbox`;
  const field = useField(props.name ?? "");
  const markFixed = useMarkFixed();
  const error = props.error ?? (props.name ? field.error : undefined);
  const controlled = props.value !== undefined;
  useFixWhenSet(props.name, props.value);

  const options = props.options?.map((o) => ("value" in o ? o : { value: String(o[0]), label: o[1] }));
  const find = (v: string) => (v ? (options?.find((o) => o.value === v) ?? (props.initial?.value === v ? props.initial : null)) : null);
  const [own, setOwn] = useState<ComboOption | null>(() => props.initial ?? find(field.value));
  const selected = controlled ? find(props.value!) : own;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<ComboOption[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  // A ref, so a parent's inline search function doesn't restart the effect on every render
  const searchRef = useRef(props.search);
  useEffect(() => {
    searchRef.current = props.search;
  });
  const remoteSearch = !!props.search;
  useEffect(() => {
    if (!open || !remoteSearch) return;
    let current = true; // a slow response for an older query must not overwrite a newer one
    const timer = setTimeout(() => searchRef.current?.(query).then((rows) => current && setRemote(rows)), 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [remoteSearch, query, open]);

  const q = fold(query.trim());
  const results = remoteSearch ? remote : (options ?? []).filter((o) => !q || fold(o.label).includes(q)).slice(0, SHOWN);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function pick(option: ComboOption | null) {
    if (props.name) markFixed(props.name);
    if (!controlled) setOwn(option);
    props.onChange?.(option?.value ?? "", option);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => Math.min(Math.max(i + step, 0), Math.max(results.length - 1, 0)));
    } else if (e.key === "Enter" && open) {
      e.preventDefault(); // pick, don't submit the form
      if (results[active]) pick(results[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className={`relative ${props.className ?? ""}`}>
      <FieldLabel htmlFor={id} label={props.label} optional={props.optional} />
      {props.name && <input type="hidden" name={props.name} value={selected?.value ?? ""} />}
      <div className="relative">
        <TextInput
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={!!error}
          aria-describedby={[error ? `${props.name ?? id}-error` : props.help ? `${props.name ?? id}-help` : "", props.describedBy ?? ""].filter(Boolean).join(" ") || undefined}
          aria-required={!props.optional}
          autoComplete="off"
          disabled={props.disabled}
          placeholder={selected ? selected.label : (props.placeholder ?? "Digite para buscar…")}
          value={open ? query : (selected?.label ?? "")}
          // Opens on a click or typing, not on focus: focus moved here after an error must not cover the message
          onClick={() => {
            setOpen(true);
            setActive(0);
          }}
          autoFocus={props.autoFocus}
          onBlur={() => {
            setOpen(false);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          color={error ? "failure" : undefined}
          className={selected && props.optional && !props.disabled ? "[&_input]:pr-9" : undefined}
        />
        {selected && props.optional && !props.disabled && (
          <button
            type="button"
            aria-label={`Limpar ${props.label}`}
            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => pick(null)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {open ? (results.length ? `${results.length} ${results.length === 1 ? "resultado" : "resultados"}` : (props.emptyText ?? "Nenhum resultado.")) : ""}
      </p>
      {open && (
        <ul ref={listRef} id={listId} role="listbox" aria-label={props.label} className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {results.length === 0 && <li className="px-3 py-2.5 text-sm text-gray-600">{props.emptyText ?? "Nenhum resultado."}</li>}
          {results.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={selected?.value === o.value}
              // mousedown, not click: the input's blur would close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm ${i === active ? "bg-primary-50 text-primary-900" : "text-gray-900"}`}
            >
              <span>
                {o.label}
                {(o.hint || o.badge) && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-600">
                    {/* Separators inside the spans so screen readers don't run the parts together */}
                    {o.hint && <span>{` ${o.hint}`}</span>}
                    {o.badge && <span className="rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-800">{` ${o.badge}`}</span>}
                  </span>
                )}
              </span>
              {o.detail && <span className="shrink-0 text-gray-600 tabular-nums">{` ${o.detail}`}</span>}
            </li>
          ))}
        </ul>
      )}
      <FieldMessage name={props.name ?? id} error={error} help={props.help} />
    </div>
  );
}
