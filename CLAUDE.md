@AGENTS.md

# CLAUDE.md

School management system (Gestão Escolar). Next.js 16 (App Router, Cache Components) + TypeScript,
Tailwind 4, Flowbite React, Better Auth, Drizzle on PostgreSQL. It replaces the Django app in
`../../django/gestao`, which is now **legacy**: don't add features there, port them here. The business rules
are Django's and must not change; when this code and Django disagree on a rule, Django is the reference.
Read [ARCHITECTURE.md](ARCHITECTURE.md) for the data model, financial rules and design system before changing
`src/lib/`, a schema or a screen.

## Commands

```bash
npm run dev              # http://localhost:3000
npm test                 # vitest
npm run typecheck && npm run lint && npm run build
npm run db:generate      # migration in drizzle/ after a schema change
npm run db:migrate       # apply pending migrations
npm run db:reset         # local only: drop everything, migrate, seed (scripts/seed.mts)
npm run db:wipe          # any DB (Neon direct URL): drop everything, migrate, `--seed` loads the seed (beta staff training); asks to type the host
```

Dev DB: Docker container `gestao-pg` (`npm run dev`, `db:reset` and `db:migrate` start it when `DATABASE_URL` is local; Postgres on localhost:5433, user/pass/db `gestao`), built by `npm run db:reset`.
Login `admin` or `secretaria`, password `senha1234` (`SEED_PASSWORD`). `db:reset` **wipes the database**: ask
before running it. Production is Vercel + Neon (README, "Deploy"): only `db:migrate`, `create-admin` and (beta only) `db:wipe` run there,
never the reset, and the seed only via `db:wipe -- --seed` while in beta; the migration goes in before the code that needs it.

## Database and auth

- **Drizzle migrations own every table** (`drizzle.config.ts`). Change `src/db/schema/app.ts`, then
  `npm run db:generate` and review the SQL. Table and column names stay Django's. `created_at`/`updated_at` have no
  DB default: keep `.$defaultFn(...)` / `.$onUpdate(...)` on them (`.defaultNow()` isn't used, to match Django).
- Foreign keys are checked per statement (Django deferred them): in a transaction, delete children before parents.
- **Better Auth owns authentication** (`src/lib/auth.ts`): login by username, its own password hashing, sessions in
  Postgres. Users are created with `auth.api.createUser` (admin plugin), never by inserting rows. `src/proxy.ts`
  validates the session with `auth.api.getSession` on every request; a layout check alone would still render the page.

## Conventions (mirror Django's)

- Language: code in English, everything the user sees in Brazilian Portuguese.
- Money: Postgres `numeric` comes back as `string`; do math with `decimal.js`, never `number`.
- Values depending on today (overdue, situation) are computed per request, never stored.
- Routes: `/<resource>`, `/<resource>/new`, `/<resource>/[id]/edit`, under `src/app/(app)/`.
  Pattern to copy: `src/app/(app)/programs/`.
- Lists: `<ListPage>` + `<ListRow>` (`src/components/list-page.tsx`) with `searchWhere` / `pageParam` /
  `PAGE_SIZE` from `src/lib/list.ts`. Search across related rows with `EXISTS` (see `departments/page.tsx`), not joins.
- Forms: `<FormFields state defaults>` + `TextField` / `SelectField` / `CheckboxField` (`src/components/form-fields.tsx`);
  Person models reuse `<PersonFields>` and `personFields` / `personUniqueError` (`src/lib/person.ts`).
  A form with client-side rows (students' guardians) submits via `onSubmit` + `startTransition` so React doesn't reset it.
- Mutations: Server Actions in `actions.ts`; **every page and action calls `requirePermission(resource, action)` first** (`src/lib/authorization.ts`); `parseForm(schema, formData)`
  (`src/lib/form.ts`); map `UNIQUE_VIOLATION` to a field/form error; success redirects with `?msg=created|updated|deleted`
  (`src/components/flash.tsx`). Edit pages use `idParam(params)`.
- Delete: `deleteAndRedirect(() => ..., listPath)` (`src/lib/crud.ts`) turns a FK violation into `?msg=protected`.
  Delete the row's Django M2M links first in the same transaction (Django does that implicitly; see `employees/actions.ts`).
  Confirmation UI: `<DeleteButton action={deleteX.bind(null, id)} />` (the list's `deleteAction`).
- Money rules live in `src/lib/finance.ts` (pure, tested against Django on random contracts) and
  `src/lib/finance-db.ts` (Django's model methods, querysets and signals). Never recompute them elsewhere.
- **Raw SQL subqueries: reference the outer row with `ref(column)` (`src/lib/sql.ts`).** In a single-table
  select Drizzle writes a bare `"id"`, which inside a subquery binds to the subquery's own table.
- **Locking: `lockInstallment()` locks, then reads the balance in a second statement.** Under READ COMMITTED a
  subquery in the locking statement keeps the old snapshot and would miss a concurrent payment.
- Uploads: `MEDIA_ROOT` (a local folder in dev), served only to signed-in users by
  `src/app/media/[...path]/route.ts`; validate images by magic bytes (`src/lib/media.ts`).
- In Server Components use `<LinkButton>`, not `<Button as={Link}>` (functions can't cross to client).
- Action color is navy: use `primary-*` classes (the `--primary-*` scale in `globals.css`), never `blue-*`.
  Icons stay gray; secondary buttons darken on hover (DESIGN.md, "The One Navy Rule").
- Client components that read the URL (`usePathname`, `useSearchParams`) must sit inside `<Suspense>`.
- Add each migrated page to `NAV` in `src/components/app-sidebar.tsx` with the `[resource, action]` its page requires.

### Permissions (not in Django)

- Better Auth Admin plugin roles (`statement` / `roles` in `src/lib/permissions.ts`); `user.role` holds one or more,
  assigned by admins on `/employees`. `admin` holds all; plain `user` holds none. The proxy checks only the session;
  every page and action calls `requirePermission()` (`src/lib/authorization.ts`). See docs/permissions.md.
- Portal for guardians and students (`src/app/portal/`, ARCHITECTURE.md "Portal for guardians and students"): portal
  logins (`user.guardianId`, role `responsavel`; `user.studentId`, role `aluno`) hold no permission. Portal pages and
  actions call `requirePortalUser()` instead of `requirePermission()` and scope every query to the viewer's students
  (`PortalViewer`). The proxy keeps portal logins in `/portal` and staff out of it.

## Business rules (from Django — don't break)

Ported rules keep their Django names in camelCase; find them in the `src/lib/` module listed in ARCHITECTURE.md
(Modules). Not migrated yet: bank slips (`billing`), users screens.

### Records

- Fixed options are short codes (`"R"`, `"A"`, `"PIX"`) with Portuguese labels (`label(choices, code)`).
- CPF/CNPJ/CEP are stored digits only.
- Student records tied to a school year (grades, incidents, delays, bathroom permissions, Q&A sessions, pathway
  memberships) point at the **enrollment**, not the student. Their forms list only active enrollments (plus the
  record's current one when editing).

### Finance

- Receivable vs payable is `Account.direction` (`Direction` in `finance.ts`); screens go through
  `src/app/(app)/accounts/kinds.ts` (Django's receivable/payable proxies), never mix them.
- A payment refreshes its installment's status (`refreshInstallmentStatus()`); don't set `Installment.status` by
  hand except to cancel (or to expire, done by the bank return import). Use `PENDING_STATUSES` for "still owed".
- Payment `amount` includes penalty, interest and monetary adjustment; principal = amount − charges + discount
  (`principal()`), and it can't exceed the installment balance or drop to zero.
- An account's gross and discount values are locked after creation; a category's direction is locked once
  accounts use it; an account with payments can't be deleted.
- Creating an enrollment creates its account and installments (`createEnrollmentAccount()`, Django's `post_save`
  signal) and its documents (`syncDocuments()`), in the same transaction; ending it early (transferred, dropped,
  cancelled) runs `cancelFutureInstallments()`. Don't duplicate that logic in a page or action.
- Bank slips (when ported): CNAB lines only in a CNAB module; a slip the bank registered must be written off
  (movement `02`, confirmed by return `10`) before its installment gets a new slip.

### Grades

- Only the exam scores (`Grade`) are stored; bimester grades, annual averages and final grades are computed per
  request with `grades.ts` (`bimesterGrade`, `finalAverage`, `finalGrade`, `passed`). `PASSING_GRADE` is 6.
- The concept (`conceptGrades()`) and extra `EX` (`extraGrades()`) scores are calculated, not typed, then saved
  to every subject of the series with `saveSeriesGrades()`.
- Adjustment (not in Django): an exam type of kind `A` ("Ajuste", staff only) replaces that bimester's grade
  (`bimesterGrade`). Django has no such kind; there the `A` exam type is a recovery exam.
- Grade locks (not in Django, `src/lib/grade-lock.ts`): staff lock a subject × bimester on `/grades/locks`; then
  teachers can't edit it, and they never edit `C`, `EX` or `A` (adjustment). Every grade write checks
  `gradeEditError()`; "staff" = holds `grades.manage`.

### Lessons

- Lessons run Monday to Saturday: 12 periods a day Monday to Friday, 7 on Saturday. Build a day's periods with
  `weekdayPeriods(weekday)` from `src/lib/lessons.ts`, not `PERIODS` (which holds all 12), and validate with
  `periodError()`. The counts (`LECTURES_PER_DAY`, `SATURDAY_LECTURES`) also feed Django choices and constraints:
  change them in Django first.

## Tests

Add Vitest tests next to the rule (`src/lib/<module>.test.ts`) for every new or changed rule. Run
`npm run format && npm test && npm run typecheck && npm run lint` after every change.
