"use client";

import {
  Alert,
  Button,
  HelperText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";
import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLeaveGuard } from "@/components/form-fields";
import { formatGrade } from "@/lib/grades";
import { RESULT, STICKY, STICKY_BODY } from "../student/cells";
import { LAST_SHEET, awaited, gradeTone, parseScore, rowResult, sameScore, scoreInput, shownName } from "../score";
import { type SheetState, saveGradeSheet } from "./actions";

/** `calculated`: staff-only (concept, extra, adjustment), never awaited from a teacher. */
type Exam = { id: number; code: string; name: string; kind: string; maxScore: string; calculated: boolean };
type Row = { id: number; name: string; average: string | null; saved: Record<number, string> };
type Props = {
  selection: { query: string; classId: number; subjectId: number; period: number };
  recovery: boolean;
  /** Final recovery: students with no annual average yet (a bimester grade missing), so not listed. */
  unaveraged: number;
  examTypes: Exam[];
  rows: Row[];
  /** Why this user can't edit an exam type here (locked bimester or staff-only), by exam type id. */
  readOnly: Record<number, string>;
  /** `staff`: the lock is information for staff, a stop for teachers. */
  notice: { text: string; staff: boolean } | null;
};

const scoreName = (r: Row, t: Exam) => `score_${r.id}_${t.id}`;
/** Editable cells by position, for moving down a column and pasting a block. */
const cellId = (row: number, col: number) => `cell-${row}-${col}`;
const RESULT_STICKY = "sticky right-0 z-10 shadow-[-1px_0_0_var(--color-gray-200)]";
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** A valid score the way it is saved ("7" → "7,00"); anything else as typed. */
const normalized = (raw: string, t: Exam) => {
  const parsed = parseScore(raw, t.maxScore);
  return "score" in parsed && parsed.score !== null ? scoreInput(parsed.score) : raw.trim();
};

/** Final recovery: why some students aren't on the sheet yet. */
const unaveragedNote = (n: number) =>
  `${count(n, "aluno ainda não tem", "alunos ainda não têm")} média anual nesta matéria (falta a nota de algum bimestre) e só ${n === 1 ? "aparece" : "aparecem"} aqui se a média ficar abaixo de 6.`;

export function GradeSheet({ selection, recovery, unaveraged, examTypes, rows, readOnly, notice }: Props) {
  const [state, action, pending] = useActionState<SheetState, FormData>(saveGradeSheet.bind(null, selection), {});
  const editable = examTypes.filter((t) => !(t.id in readOnly));
  const loaded = (r: Row, t: Exam) => scoreInput(r.saved[t.id]);
  // Only what the user changed: untouched cells follow the page, so grades someone else saved show up after a reload
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  // A save that erases saved grades asks first, in the save bar; the ref lets the confirmed submit through
  const [confirming, setConfirming] = useState(false);
  const deleteOk = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  // Phones show one exam column at a time: teachers grade one exam for the whole class
  const [exam, setExam] = useState(() =>
    Math.max(
      0,
      examTypes.findIndex((t) => !(t.id in readOnly)),
    ),
  );
  const value = (r: Row, t: Exam) => (t.id in readOnly ? loaded(r, t) : (edits[scoreName(r, t)] ?? loaded(r, t)));
  const sheetCell = (r: Row, t: Exam) => ({
    kind: t.kind,
    raw: value(r, t),
    maxScore: t.maxScore,
    calculated: t.calculated,
  });

  /** The typed error once the user leaves the cell, or the server's while the cell still holds what was sent. */
  const errorOf = (r: Row, t: Exam) => {
    const name = scoreName(r, t);
    const parsed = parseScore(value(r, t), t.maxScore);
    if (touched.has(name) && "error" in parsed) return parsed.error;
    return state.values?.[name] === value(r, t) ? state.errors?.[name]?.[0] : undefined;
  };
  const cells = rows.flatMap((r, row) => editable.map((t, col) => ({ r, t, row, col })));
  const changed = cells.filter(({ r, t }) => !sameScore(value(r, t), loaded(r, t))).length;
  const invalid = cells.flatMap((c) => {
    const error = errorOf(c.r, c.t);
    return error ? [{ ...c, error }] : [];
  });
  const blanks = cells.filter(({ r, t }) => awaited(sheetCell(r, t)));
  const removals = cells.filter(({ r, t }) => loaded(r, t) !== "" && value(r, t).trim() === "").length;
  useLeaveGuard(changed > 0);

  // After a save the page reloads in place: the edits are now the saved grades (reset while rendering, not in an effect)
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.saved) {
      setEdits({});
      setTouched(new Set());
      setPasteNote(null);
    }
  }
  // A failed save takes the user to the first invalid cell, showing its column on phones
  useEffect(() => {
    const cell = state.errors && document.querySelector<HTMLInputElement>("form[data-sheet] [aria-invalid=true]");
    if (!cell) return;
    requestAnimationFrame(() => {
      setExam(Number(cell.dataset.exam));
      requestAnimationFrame(() => cell.focus());
    });
  }, [state]);
  // Reopened on the next visit to /grades/entry
  useEffect(() => {
    document.cookie = `${LAST_SHEET}=${encodeURIComponent(selection.query)}; path=/grades; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  }, [selection.query]);

  if (!examTypes.length)
    return (
      <Alert color="warning">Cadastre um tipo de avaliação {recovery ? "de recuperação " : ""}para lançar notas.</Alert>
    );
  if (!rows.length)
    return (
      <p className="text-gray-500">
        {!recovery
          ? "Nenhum aluno ativo nesta turma."
          : unaveraged
            ? `Ninguém em recuperação por enquanto: ${unaveragedNote(unaveraged)}`
            : "Nenhum aluno desta turma está em recuperação nesta matéria."}
      </p>
    );

  const set = (name: string, raw: string) => {
    setEdits((v) => ({ ...v, [name]: raw }));
    setConfirming(false);
  };
  const touch = (...names: string[]) => setTouched((s) => new Set([...s, ...names]));
  /** Leaving a cell shows its error and writes a valid score the way it's saved. */
  const leave = (r: Row, t: Exam) => {
    const name = scoreName(r, t);
    if (name in edits) set(name, normalized(edits[name], t));
    touch(name);
  };
  /** Puts a cell back to its saved value (Esc). */
  const restore = (name: string) =>
    setEdits((v) => {
      const next = { ...v };
      delete next[name];
      return next;
    });
  /** Shows the cell (switching the phone's exam column) and focuses it. */
  const focusCell = (row: number, t: Exam) => {
    setExam(examTypes.indexOf(t));
    requestAnimationFrame(() => document.getElementById(cellId(row, editable.indexOf(t)))?.focus());
  };
  const move = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number, name: string) => {
    if (e.key === "Escape") return restore(name);
    // Left/Right leave the cell only from its edge (or with the whole value selected, as on focus), like a spreadsheet
    const input = e.currentTarget;
    const whole = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const side =
      e.key === "ArrowLeft" && (whole || input.selectionEnd === 0)
        ? -1
        : e.key === "ArrowRight" && (whole || input.selectionStart === input.value.length)
          ? 1
          : 0;
    if (side && editable[col + side]) {
      e.preventDefault();
      return focusCell(row, editable[col + side]);
    }
    const down = e.key === "ArrowDown" || (e.key === "Enter" && !e.shiftKey);
    const up = e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey);
    if (!down && !up) return;
    e.preventDefault();
    document.getElementById(cellId(row + (down ? 1 : -1), col))?.focus();
  };
  // A block copied from a spreadsheet fills down (students) and across (editable exams) from this cell
  const paste = (e: ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData("text").replace(/\r/g, "").replace(/\n+$/, "");
    if (!/[\t\n]/.test(text)) return;
    e.preventDefault();
    const filled: Record<string, string> = {};
    let dropped = 0;
    text.split("\n").forEach((line, dr) =>
      line.split("\t").forEach((raw, dc) => {
        const r = rows[row + dr];
        const t = editable[col + dc];
        if (r && t) filled[scoreName(r, t)] = normalized(raw, t);
        else dropped++;
      }),
    );
    setEdits((v) => ({ ...v, ...filled }));
    touch(...Object.keys(filled));
    setPasteNote(
      dropped ? `${count(dropped, "valor colado ficou", "valores colados ficaram")} fora da planilha` : null,
    );
  };
  const progress = [changed > 0 && count(changed, "alteração não salva", "alterações não salvas"), pasteNote].filter(
    (s) => !!s,
  );
  const lives = rows.map((r) =>
    rowResult(
      examTypes.map((t) => sheetCell(r, t)),
      recovery,
      r.average,
    ),
  );
  const below = lives.filter((l) => l.atRisk).length;
  const firstAtRisk = lives.findIndex((l) => l.atRisk);
  /** Invalid cells stop the save here (no round trip); a save that erases grades waits for the bar's confirmation. */
  const submit = (e: FormEvent<HTMLFormElement>) => {
    const bad = cells.filter(
      ({ r, t }) => !sameScore(value(r, t), loaded(r, t)) && "error" in parseScore(value(r, t), t.maxScore),
    );
    if (bad.length) {
      e.preventDefault();
      touch(...bad.map(({ r, t }) => scoreName(r, t)));
      return focusCell(bad[0].row, bad[0].t);
    }
    if (removals && !deleteOk.current) {
      e.preventDefault();
      return setConfirming(true);
    }
    deleteOk.current = false;
    setConfirming(false);
  };
  // Esc or a paste can undo the erasing while the question is open: ask only while it still applies
  const asking = confirming && removals > 0;
  const savedAt =
    state.saved && new Date(state.saved).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  // Shown in the bar and announced by the status line
  const invalidMsg = count(invalid.length, "nota inválida", "notas inválidas");
  const removeMsg = count(removals, "nota já lançada será apagada", "notas já lançadas serão apagadas");
  // `count` includes erased grades, so "alterações", not "notas salvas"
  const savedMsg =
    savedAt && !changed
      ? state.count
        ? `${count(state.count, "alteração salva", "alterações salvas")} às ${savedAt}`
        : `Nada mudou desde o último salvamento (${savedAt})`
      : null;
  // Phones show one exam: its button marks unsaved edits and errors hiding in the others
  const marks = examTypes.map((t) => ({
    edited: cells.some((c) => c.t === t && !sameScore(value(c.r, t), loaded(c.r, t))),
    errors: invalid.filter((c) => c.t === t).length,
  }));
  /** Why an exam column reads as it does: not editable here, or calculated but open to staff. */
  const note = (t: Exam) =>
    t.id in readOnly
      ? readOnly[t.id] !== notice?.text
        ? readOnly[t.id]
        : null
      : t.calculated
        ? "calculado · editável pela secretaria"
        : null;
  const switchExam = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (exam + step + examTypes.length) % examTypes.length;
    setExam(next);
    document.getElementById(`exam-${next}`)?.focus();
  };
  const FOCUS = "rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500";
  const narrow = (i: number) => (i === exam ? "" : "hidden sm:table-cell");

  return (
    <form
      ref={form}
      action={action}
      onSubmit={submit}
      className="flex flex-col gap-3"
      data-sheet=""
      data-dirty={changed ? "" : undefined}
    >
      {/* Only while the problem is still on screen: fixed cells clear it */}
      {state.formError && invalid.length > 0 && <Alert color="failure">{state.formError}</Alert>}
      {notice && (
        <Alert color={notice.staff ? "gray" : "warning"}>
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined" aria-hidden="true">
              lock
            </span>
            {notice.text}
          </span>
        </Alert>
      )}
      <dl className="hidden flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 sm:flex">
        {examTypes.map((t) => (
          <div key={t.id}>
            <dt className="inline font-semibold text-gray-900">{t.code}</dt>{" "}
            <dd className="inline">
              {t.name}
              {note(t) && <span className="text-gray-500"> ({note(t)})</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-gray-600">
        Use vírgula nos decimais (ex.: 2,5) e apague o valor para remover uma nota.
        <span className="hidden sm:inline">
          {" "}
          Enter desce para o próximo aluno (Shift+Enter sobe); colar uma coluna de planilha preenche vários alunos.
        </span>
        {recovery && unaveraged > 0 && <span className="block">{unaveragedNote(unaveraged)}</span>}
      </p>
      <div role="radiogroup" aria-label="Avaliação mostrada" className="flex gap-2 sm:hidden">
        {examTypes.map((t, i) => (
          <button
            key={t.id}
            id={`exam-${i}`}
            type="button"
            role="radio"
            aria-checked={i === exam}
            tabIndex={i === exam ? 0 : -1}
            onClick={() => setExam(i)}
            onKeyDown={switchExam}
            className={`relative min-h-11 flex-1 rounded-lg border px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${i === exam ? "border-gray-500 bg-gray-100 font-semibold text-gray-900" : "border-gray-200 bg-white font-medium text-gray-600 hover:bg-gray-50"}`}
          >
            {t.code}
            {marks[i].errors > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-red-600 px-1 text-xs leading-5 font-semibold text-white">
                {marks[i].errors}
                <span className="sr-only"> {marks[i].errors === 1 ? "nota inválida" : "notas inválidas"}</span>
              </span>
            ) : (
              marks[i].edited && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary-500">
                  <span className="sr-only">alterada</span>
                </span>
              )
            )}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 sm:hidden">
        <span className="font-semibold text-gray-900">{examTypes[exam]?.code}</span> {examTypes[exam]?.name}
        {examTypes[exam] && note(examTypes[exam]) && <span className="text-gray-500"> ({note(examTypes[exam])})</span>}
      </p>
      {/* isolate: Flowbite's white panel behind the table sits at -z-10 and would drop behind the page floor */}
      <div className="isolate -mx-1 overflow-x-auto px-1 pb-2">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell scope="col" className={`${STICKY} px-4`}>
                Aluno
              </TableHeadCell>
              {recovery && (
                <TableHeadCell scope="col" className="px-3 text-right whitespace-nowrap">
                  Média anual
                </TableHeadCell>
              )}
              {examTypes.map((t, i) => (
                <TableHeadCell key={t.id} scope="col" className={`${narrow(i)} px-3 text-right whitespace-nowrap`}>
                  {t.code} <span className="block text-xs font-normal normal-case">até {formatGrade(t.maxScore)}</span>
                  {t.calculated && !(t.id in readOnly) && (
                    <span className="block text-xs font-normal normal-case">calculado</span>
                  )}
                </TableHeadCell>
              ))}
              <TableHeadCell scope="col" className={`${RESULT_STICKY} px-4 text-right whitespace-nowrap`}>
                {recovery ? (
                  "Média final"
                ) : (
                  <>
                    Nota<span className="hidden sm:inline"> do bimestre</span>
                  </>
                )}
              </TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-gray-100 tabular-nums">
            {rows.map((r, row) => {
              const live = lives[row];
              // The grade is a sum: a partial row is low by design, so it turns red only once it can't reach passing
              const tone =
                live.invalid || live.result === null
                  ? "text-gray-500"
                  : live.atRisk
                    ? "text-red-600"
                    : live.incomplete
                      ? "text-gray-500"
                      : "text-gray-900";
              return (
                <TableRow key={r.id}>
                  <th
                    scope="row"
                    title={r.name}
                    className={`${STICKY_BODY} max-w-40 truncate px-3 py-2 text-left font-medium text-gray-900 sm:max-w-none sm:min-w-36 sm:px-4 sm:whitespace-normal`}
                  >
                    {r.name}
                  </th>
                  {recovery && (
                    <TableCell className={`px-3 py-2 text-right ${gradeTone(r.average)}`}>
                      {formatGrade(r.average)}
                    </TableCell>
                  )}
                  {examTypes.map((t, i) => {
                    const name = scoreName(r, t);
                    const col = editable.indexOf(t);
                    if (col < 0)
                      return (
                        <TableCell key={t.id} className={`${narrow(i)} px-3 py-2 text-right text-gray-500`}>
                          {loaded(r, t) || "—"}
                        </TableCell>
                      );
                    const error = errorOf(r, t);
                    const edited = !sameScore(value(r, t), loaded(r, t));
                    const described = [error && `${name}-error`, edited && `${name}-before`].filter(Boolean).join(" ");
                    return (
                      // Calculated columns (staff only) read as results and stay out of the Tab order
                      <TableCell
                        key={t.id}
                        className={`${narrow(i)} px-3 py-2 text-right ${t.calculated ? RESULT : ""}`}
                      >
                        <input type="hidden" name={shownName(name)} value={loaded(r, t)} />
                        <TextInput
                          id={cellId(row, col)}
                          tabIndex={t.calculated ? -1 : undefined}
                          data-exam={i}
                          name={name}
                          value={value(r, t)}
                          // A deleted grade shows its old value struck through
                          placeholder={loaded(r, t)}
                          onChange={(e) => set(name, e.target.value)}
                          onBlur={() => leave(r, t)}
                          onFocus={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => move(e, row, col, name)}
                          onPaste={(e) => paste(e, row, col)}
                          readOnly={pending}
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
                          aria-label={`${r.name}, ${t.name}`}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={described || undefined}
                          color={error ? "failure" : undefined}
                          sizing="sm"
                          className={`ml-auto w-20 [&_input]:py-3 [&_input]:text-right [&_input]:text-base [&_input]:tabular-nums [&_input::placeholder]:line-through sm:[&_input]:py-2 sm:[&_input]:text-sm ${edited && !error ? "[&_input]:border-primary-300 [&_input]:bg-primary-100" : t.calculated ? "[&_input]:bg-white [&_input]:text-gray-600" : ""}`}
                        />
                        {edited && (
                          <span id={`${name}-before`} className="sr-only">
                            Antes: {loaded(r, t) || "em branco"}. Esc desfaz.
                          </span>
                        )}
                        {/* Under the cell, so the error sits where it is fixed even mid-table */}
                        {error && (
                          <HelperText
                            id={`${name}-error`}
                            color="failure"
                            className="mt-1 ml-auto w-20 text-right text-xs leading-tight"
                          >
                            {error}
                          </HelperText>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className={`${RESULT} ${RESULT_STICKY} px-4 py-2 text-right font-semibold ${tone}`}>
                    {live.invalid ? "—" : formatGrade(live.result)}
                    {live.incomplete && !live.invalid && live.result !== null && (
                      <span className="block text-xs font-normal text-gray-600">parcial</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {editable.length ? (
        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 bg-gray-50 px-4 py-3 lg:-mx-8 lg:px-8">
          {asking ? (
            <>
              <p className="text-sm font-medium text-gray-900">{removeMsg}.</p>
              <Button
                color="red"
                autoFocus
                onClick={() => {
                  deleteOk.current = true;
                  form.current?.requestSubmit();
                }}
              >
                Apagar e salvar
              </Button>
              <Button color="alternative" onClick={() => setConfirming(false)}>
                Voltar
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar notas"}
              </Button>
              <p className="text-sm text-gray-600">
                {progress.map((p) => `${p} · `)}
                {/* Phones keep the bar to two lines: the class size is on screen anyway */}
                <span className="hidden sm:inline">{count(rows.length, "aluno", "alunos")} · </span>
                {below > 0 && (
                  <>
                    <button
                      type="button"
                      className={`text-red-700 underline underline-offset-2 hover:text-red-800 ${FOCUS}`}
                      onClick={() => focusCell(firstAtRisk, editable[0])}
                    >
                      {below} abaixo de 6
                    </button>
                    {" · "}
                  </>
                )}
                {blanks.length > 0 ? (
                  <button
                    type="button"
                    className={`underline underline-offset-2 hover:text-gray-900 ${FOCUS}`}
                    onClick={() => focusCell(blanks[0].row, blanks[0].t)}
                  >
                    {count(blanks.length, "nota em branco", "notas em branco")}
                  </button>
                ) : (
                  "completo"
                )}
              </p>
              {invalid.length > 0 ? (
                <button
                  type="button"
                  className={`text-left text-sm text-red-700 underline underline-offset-2 ${FOCUS}`}
                  onClick={() => focusCell(invalid[0].row, invalid[0].t)}
                >
                  {invalidMsg}
                  <span className="hidden sm:inline">
                    {" "}
                    ({invalid[0].r.name}, {invalid[0].t.code}: {invalid[0].error})
                  </span>
                </button>
              ) : (
                savedMsg && (
                  <p className="flex items-center gap-1 text-sm font-medium text-green-700">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      check_circle
                    </span>
                    {savedMsg}
                  </p>
                )
              )}
            </>
          )}
          {/* Announced: errors, the deletion question and the save result, not every keystroke's count */}
          <p role="status" className="sr-only">
            {invalid.length > 0 ? invalidMsg : asking ? `${removeMsg}. Confirme ou volte.` : (savedMsg ?? "")}
          </p>
        </div>
      ) : (
        !notice && <p className="text-sm text-gray-500">{Object.values(readOnly)[0]}</p>
      )}
    </form>
  );
}
