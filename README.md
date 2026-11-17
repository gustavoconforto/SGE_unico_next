# Gestão Escolar

School management system for **Único Educacional**. It covers staff, courses,
classes, subjects, students and guardians, enrollment contracts, grades,
lessons, pathways and the school's finances (receivables, payables,
installments and payments).

This Next.js app replaces the Django project in `../../django/gestao`, which is
now legacy and kept only until cutover (it still owns the database schema).
The UI is in Brazilian Portuguese; the code is in English.

| | |
|---|---|
| Language | TypeScript |
| Framework | Next.js 16 (App Router, Cache Components), React 19 |
| Front end | Tailwind CSS 4 + Flowbite React |
| Auth | Better Auth (username + password, sessions in Postgres) |
| Database | PostgreSQL via Drizzle ORM and Drizzle migrations (Docker in dev, Neon in production) |
| Tests | Vitest |

## Features

| Area | What you can do |
|---|---|
| Secretaria | Students with their guardians, enrollments, class roster |
| Financeiro | Accounts receivable and payable, installments, payments (baixas) and receipts, financial categories, suppliers |
| Pedagógico | Grade entry, student grades and report cards, timetable, class diary, Q&A sessions (plantões) |
| Itinerários | Pathways and their yearly groups (with a printable diary), sign-ups per group or per student, lessons and roll calls, attendance, workload, pathway grades and the extra grade they feed |
| Ocorrências | Incidents, delays, bathroom permissions, concept grades |
| Recursos humanos | Employees and roles |
| Configuração | School years, programs, enrollment contracts, discounts, required documents, classes, departments, subjects, subjects per series, exam and incident types |

Creating an enrollment automatically creates its receivable account and
monthly installments. Ending an enrollment early (transferred, dropped,
cancelled) cancels its future open installments. See
[ARCHITECTURE.md](ARCHITECTURE.md#enrollment--finance-workflow).

Still only in the Django project: Bradesco bank slips (CNAB 400) and the users /
groups / permissions screens.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create .env from the example and fill it in
cp .env.example .env

# 3. Create every table and load the test data (starts the gestao-pg
#    Docker container: Postgres on localhost:5433, user/password/db "gestao")
npm run db:reset

# 4. Run (also starts the container)
npm run dev
```

Open http://localhost:3000 and sign in as `admin` (administrator) or
`secretaria`, password `senha1234` (or `SEED_PASSWORD` from `.env`).

## Common commands

```bash
npm run dev              # dev server
npm test                 # unit tests (vitest)
npm run typecheck        # tsc
npm run lint             # eslint
npm run build            # production build
npm run db:generate      # new migration in drizzle/ after a schema change
npm run db:migrate       # apply pending migrations (dev or Neon)
npm run db:reset         # local only: drop everything, migrate, load test data
npm run create-admin -- <username> "<Full name>"   # administrator (any database), see Deploy
```

## Deploy (Vercel + Neon)

Production runs on Vercel with a Neon Postgres database. The schema comes only
from the migrations in `drizzle/`; the test seed and `db:reset` never run there
(`db:reset` refuses any database that isn't on your machine).

Neon gives two connection strings: the **pooled** one (host ends in
`-pooler`), for the app on Vercel, and the **direct** one, for migrations and
`create-admin` run from your machine. Put both in the same region as the Vercel
functions (e.g. Neon `aws-sa-east-1` and Vercel `gru1`, São Paulo): every page
runs several queries, and each one crosses the distance between them.

A `DATABASE_URL` set on the command line wins over `.env`, which is how the
commands below reach Neon while `.env` keeps pointing at the local database.

### First deploy

1. **Empty the database.** In Neon's SQL editor:
   ```sql
   DROP SCHEMA IF EXISTS drizzle CASCADE;
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
2. **Create the tables**, from your machine with the direct URL:
   ```bash
   DATABASE_URL="<neon direct url>" npm run db:migrate
   ```
3. **Create the first administrator** (asks for the password without showing it):
   ```bash
   DATABASE_URL="<neon direct url>" npm run create-admin -- <username> "<Full name>" [email]
   ```
4. **Set the Vercel environment variables** (Production):
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** URL |
   | `BETTER_AUTH_SECRET` | a new secret, `openssl rand -base64 32` (never the dev one) |
   | `BETTER_AUTH_URL` | the production address, e.g. `https://gestao.example.com` (login cookies depend on it) |
   | `MEDIA_ROOT` | `/tmp/media`: the only writable folder on Vercel (see the photo warning below) |
5. **Deploy**, then sign in with the administrator and open a few screens.

### Later deploys

- Schema change: edit `src/db/schema/`, run `npm run db:generate`, review and
  commit the SQL in `drizzle/`.
- Run `DATABASE_URL="<neon direct url>" npm run db:migrate` **before**
  deploying the code that needs it. Code deployed ahead of its migration fails
  on the missing columns.
- More users: `npm run create-admin` the same way (every user it creates is an
  administrator until the users screen is ported).

### Not solved yet

- **Student photos:** Vercel's disk is not kept between requests, so photos
  saved under `MEDIA_ROOT` are lost. They need object storage (e.g. Vercel Blob)
  before go-live. Any other `MEDIA_ROOT` than `/tmp/...` is read-only there: the
  student is saved, then the photo write fails with an error page.
- **Existing data:** the steps above start production empty. Moving the school's
  current data from Django's database isn't covered.

## Project layout

```
src/app/(app)/   signed-in screens, one folder per resource (list, new, [id]/edit, actions.ts)
src/app/(print)/ printable pages (report card, receipt, pathway diary, workload)
src/app/login/   login page
src/app/api/     Better Auth handler
src/app/media/   uploaded files, served to signed-in users
src/components/  layout, sidebar, list and form components
src/db/          Drizzle client and schema (app tables, Better Auth tables)
src/lib/         business rules (finance, grades, lessons, pathways…) and helpers, with tests
src/proxy.ts     redirects to /login unless Better Auth validates the session
drizzle/         migrations for every table
scripts/         db:reset + test seed, create-admin, start-db (Docker before dev/db)
public/img/      logo and images
doc/            user manual, in Portuguese
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): modules, data model, financial rules,
  request flow, design system.
- [CLAUDE.md](CLAUDE.md): conventions for AI coding agents (and a good
  checklist for humans too).
- [doc/README.md](doc/README.md): user manual (Portuguese), screen by screen
  and the common workflows. Copied from the Django project; some screens
  (menu layout, bank slips, users and groups) still describe the Django UI.

## Known issues

- Permissions aren't checked: any signed-in user can open every screen.
- Bank slips and user management haven't been ported yet.
