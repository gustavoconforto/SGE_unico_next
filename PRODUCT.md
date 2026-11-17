# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Secretaria staff:** front office. Students and guardians, enrollments and contracts, class rosters, documents, report cards, receipts.
- **Financial staff:** receivables and payables, installments, payments (baixas), categories, suppliers.
- **Teachers:** grade entry, class diary, roll calls, pathway sessions and grades, incidents.
- **Coordination / direção:** follow grades, situations (approved, recovery, failed), incidents, pathways and workload across classes.

All of them are school employees doing routine administrative and pedagogical work, often repetitively and under time pressure (enrollment season, bimester grade closing, month-end payments).

## Product Purpose

Gestão Escolar runs a school's administration and pedagogy in one place: staff, programs, classes, subjects, students and guardians, enrollment contracts, grades, lessons, pathways (itinerários), incidents and the school's finances. Creating an enrollment automatically creates its receivable account and monthly installments; ending it early cancels the future ones.

It replaces a legacy Django system (`../../django/gestao`). Success means staff do every task they did in Django here, faster and with fewer errors, with the same business rules.

## Positioning

Built from the actual rules of a working Brazilian school (Novo Ensino Médio pathways, bimester grades with recovery, concept grades, enrollment contracts that drive the finances) rather than a generic school ERP. Today it serves Único Educacional; it is meant to serve other schools later, so school identity must stay replaceable.

## Operating Context

- Mostly office desktops with mouse and keyboard, in long sessions of dense data entry (grades, payments, enrollments).
- Some tasks happen on phones in hallways and classrooms: roll calls, incidents, delays, bathroom exits, quick student lookups.
- Printed documents are part of the workflow: report cards, receipts, pathway diaries, workload reports, on school letterhead (`src/app/(print)/`).
- School calendar rhythms: school years, four bimesters plus final recovery, monthly installments.

## Capabilities and Constraints

- Everything the user sees is in Brazilian Portuguese; dates, money (R$) and decimals (comma) in pt-BR format. CPF/CNPJ/CEP are shown formatted, stored as digits.
- Business rules come from the Django system and must not change; Django is the reference when they disagree.
- Next.js 16, Tailwind 4, Flowbite React; Material Symbols icons in the sidebar.
- Not ported yet: Bradesco bank slips (CNAB 400) and the users / groups / permissions screens.
- Open: per-role access (which screens each user type sees) is not defined in this app yet.
- Open: how a second school would be onboarded (separate deploy vs multi-tenant) is undecided.

## Brand Commitments

- Current school: **Único Educacional**, logos in `public/img/` (`Logo_light.png`, `unico_logo_pequeno.png`), shown in the sidebar, login, and print letterhead.
- Because other schools are planned, the school's name, logo and letterhead are tenant content, not the product's identity. The product name is "Gestão Escolar".

## Evidence on Hand

- Seeded dev data (`scripts/seed.mts`) with realistic students, enrollments, grades and finances. It is test data, not real customer data.
- No testimonials, metrics or customer list exist; don't invent any.

## Product Principles

1. **The rules are the product.** Screens present Django's rules faithfully; no screen recomputes or reinterprets them.
2. **Built for repetition.** Optimize for the staff member doing the same task fifty times a day: density, keyboard flow, predictable layouts, no extra clicks.
3. **State is obvious at a glance.** Overdue, pending, below passing, in recovery: the situation a row is in should be readable without opening it.
4. **Desktop first, phone capable.** Data-heavy screens are designed for desktop; quick classroom tasks must work one-handed on a phone.
5. **School-neutral core.** Anything specific to Único lives in replaceable content, so another school can adopt the system.
