import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import Link from "next/link";
import { DeleteButton } from "./delete-button";
import { LinkButton } from "./link-button";
import { ListPagination, SearchBox, SortHeader } from "./list-controls";
import { CellLabel, ListHeaders } from "./list-labels";
import { PAGE_SIZE } from "@/lib/list";

/**
 * Below sm each row becomes a card: no header row, the naming cell (PRIMARY_CELL) on its own line, the others labelled
 * (CellLabel) side by side, the actions at the end. A 9-column table can't fit a phone without hiding the amounts.
 */
export const PHONE_CARDS =
  "max-sm:block max-sm:[&_thead]:hidden max-sm:[&_tbody]:block max-sm:[&_tbody>tr]:flex max-sm:[&_tbody>tr]:flex-wrap max-sm:[&_tbody>tr]:items-end max-sm:[&_tbody>tr]:gap-x-5 max-sm:[&_tbody>tr]:gap-y-2 max-sm:[&_tbody>tr]:p-3 max-sm:[&_tbody>tr]:border-b max-sm:[&_tbody>tr]:border-gray-200 max-sm:[&_td]:p-0";
/** The cell that names the row leads its phone card, on a line of its own. */
export const PRIMARY_CELL = "font-medium text-gray-900 dark:text-white max-sm:order-first max-sm:basis-full";

/**
 * The Django list page: title, "new" button, live search, table and pagination.
 * Default order: a work queue (Parcelas) shows what is due soonest; a record of what happened (contas, baixas) shows the newest first.
 */
export function ListPage(props: {
  title: string;
  newHref?: string;
  newLabel?: string;
  searchPlaceholder: string;
  /** FilterSelect / FilterDate controls shown beside the search. */
  filters?: React.ReactNode;
  /** Totals over the filtered set, shown above the table so they're read before the rows. */
  summary?: React.ReactNode;
  /** Notes under the table. */
  footer?: React.ReactNode;
  headers: string[];
  /** Headers of number columns, right-aligned over their values. */
  numeric?: string[];
  /** Sortable headers and their `?sort=` key (see sortParam); `sort` is the current param. */
  sortable?: Record<string, string>;
  sort?: string;
  /** Shown in place of the rows when there are none. */
  empty?: string;
  page: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{props.title}</h1>
        {props.newHref && <LinkButton href={props.newHref}>{props.newLabel}</LinkButton>}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <SearchBox placeholder={props.searchPlaceholder} />
        {props.filters}
        <p className="pb-2.5 text-sm text-gray-600 tabular-nums sm:ml-auto" aria-live="polite">
          {props.total.toLocaleString("pt-BR")} {props.total === 1 ? "registro" : "registros"}
        </p>
      </div>
      {props.summary}
      <div className="overflow-x-auto">
        {/* Flowbite's px-6 cells push a 9-column list past 1440px; px-2.5 keeps it on screen. py-2.5: ~44px rows, about twice as many on screen */}
        <Table striped className={`[&_td]:px-2.5 [&_td]:py-2.5 [&_th]:px-2.5 ${PHONE_CARDS}`}>
          <TableHead>
            <TableRow>
              {props.headers.map((header) => (
                <TableHeadCell
                  key={header}
                  className={props.numeric?.includes(header) ? "text-right" : ""}
                  aria-sort={!props.sortable?.[header] ? undefined : props.sort === props.sortable[header] ? "ascending" : props.sort === `-${props.sortable[header]}` ? "descending" : "none"}
                >
                  {props.sortable?.[header] ? <SortHeader label={header} sortKey={props.sortable[header]} /> : header}
                </TableHeadCell>
              ))}
              {/* w-px: as narrow as its buttons; the left border shows where it overlaps a scrolled table */}
              <TableHeadCell className="sticky right-0 w-px border-l border-gray-200">Ações</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <ListHeaders headers={props.headers}>{props.children}</ListHeaders>
            {props.total === 0 && (
              <TableRow>
                <TableCell colSpan={props.headers.length + 1} className="text-center text-gray-500">
                  {props.empty ?? "Nenhum registro encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {props.footer}
      <ListPagination page={props.page} totalPages={Math.ceil(props.total / PAGE_SIZE)} />
    </div>
  );
}

/** Text past this many characters is cut to one line (full text on hover); shorter text never wraps, so rows stay one line tall. */
const LONG = 40;

/** A long text cell on one line: the row stays one line tall and the full text is in the title. */
export function Clip({ text, className = "max-w-48" }: { text: string; className?: string }) {
  return (
    <span className={`block truncate ${className}`} title={text}>
      {text}
    </span>
  );
}

/** "Contrato Ana Souza - Ensino Médio - 1ª Série - 2026": who on the first line, the course under it (as in the payment picker). */
export function AccountName({ text }: { text: string }) {
  const cut = text.indexOf(" - ");
  if (cut < 0) return <Clip text={text} className="max-w-48 max-sm:max-w-full" />;
  return (
    <span className="block" title={text}>
      <span className="block max-w-48 truncate max-sm:max-w-full">{text.slice(0, cut)}</span>
      <span className="block max-w-48 truncate max-sm:max-w-full text-xs font-normal text-gray-500">{text.slice(cut + 3)}</span>
    </span>
  );
}

/** Right-aligned money that never wraps. */
export function MoneyCell({ children }: { children: React.ReactNode }) {
  return <span className="block text-right whitespace-nowrap tabular-nums">{children}</span>;
}

/** The pinned actions cell; on phone cards it sits at the end of the card instead. */
export const ACTIONS_CELL = "sticky right-0 border-l border-gray-200 bg-inherit max-sm:static max-sm:ml-auto max-sm:border-0";

/** One row: the cells, then `actions` (extra icon buttons), edit, and delete when `deleteAction` is given. `primary`: the cell that names the row (bold). */
/** `href`: where the name leads when the record has its own page (defaults to `editHref`); no `editHref`, no pencil (read-only viewers). */
export function ListRow(props: { cells: React.ReactNode[]; primary?: number; label: string; href?: string; editHref?: string; actions?: React.ReactNode; deleteAction?: () => Promise<void>; deleteNote?: string }) {
  const primary = props.primary ?? 0;
  const href = props.href ?? props.editHref;
  return (
    <TableRow>
      {props.cells.map((cell, i) => {
        const text = typeof cell === "string" || typeof cell === "number" ? String(cell) : null;
        const content = text !== null && text.length > LONG ? <Clip text={text} /> : cell;
        return (
          <TableCell key={i} className={`${i === primary ? PRIMARY_CELL : ""} ${text !== null ? "whitespace-nowrap" : ""}`}>
            {i !== primary && <CellLabel i={i} />}
            {/* The name opens the record too: a bigger target than the pencil, and the first stop when tabbing */}
            {i === primary && href ? (
              <Link href={href} className="underline-offset-2 hover:text-primary-700 hover:underline">
                {content}
              </Link>
            ) : (
              content
            )}
          </TableCell>
        );
      })}
      {/* Pinned right, so a wide table's actions stay on screen; a flex <td> would lose its table-cell layout */}
      <TableCell className={ACTIONS_CELL}>
        <div className="flex gap-2 whitespace-nowrap">
          {props.actions}
          {props.editHref && <LinkButton href={props.editHref} size="xs" color="alternative" className="px-2" aria-label={`Editar ${props.label}`} data-tip="Editar">
            <span className="material-symbols-outlined" aria-hidden="true">
              edit
            </span>
          </LinkButton>}
          {props.deleteAction && <DeleteButton action={props.deleteAction} label={props.label} note={props.deleteNote} />}
        </div>
      </TableCell>
    </TableRow>
  );
}
