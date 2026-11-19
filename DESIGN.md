---
name: Gestão Escolar
description: School management back office, a calm light interface where the data does the talking.
colors:
  action-navy: "#1e3a5f"
  action-navy-deep: "#172d4a"
  focus-navy: "#3c5f8f"
  selection-navy: "#eef2f8"
  ink: "#111827"
  ink-soft: "#374151"
  ink-muted: "#6b7280"
  paper: "#f9fafb"
  panel: "#ffffff"
  hover-gray: "#f3f4f6"
  hairline: "#e5e7eb"
  field-border: "#d1d5db"
  alert-red: "#e02424"
  alert-red-deep: "#c81e1e"
  alert-red-wash: "#fdf2f2"
  ok-green: "#046c4e"
  ok-green-wash: "#def7ec"
  caution-brown: "#723b13"
typography:
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.333
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  cell: "10px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-navy}"
    textColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "40px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.action-navy-deep}"
  button-alternative:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 8px"
    height: "32px"
  button-alternative-hover:
    backgroundColor: "{colors.hover-gray}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px"
    typography: "{typography.body}"
  table-header-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    padding: "12px 10px"
    typography: "{typography.label}"
  table-cell:
    textColor: "{colors.ink}"
    padding: "10px"
    typography: "{typography.body}"
  badge-success:
    backgroundColor: "{colors.ok-green-wash}"
    textColor: "{colors.ok-green}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  nav-item-active:
    backgroundColor: "{colors.hover-gray}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 8px 8px 32px"
---

# Design System: Gestão Escolar

## Overview

**Creative North Star: "The Quiet Office"**

Gestão Escolar is where secretaria, finance, teachers and coordination spend whole working days. The interface recedes: a pale gray floor, white panels that hold the data, one navy for action, and color otherwise reserved for state. Nothing decorative competes with a student's name, a balance or a grade. If a screen draws attention to itself, it is too loud.

It is built on Flowbite React's light theme over Tailwind 4, used close to stock. Its craft is restraint and consistency: every list looks like every other list, every form like every other form, so someone who learned one screen has learned them all. Density is medium-high: 14px body text, 10px cell padding, tabular numerals wherever numbers stack.

The product serves Único Educacional today and other schools later. The school's logo and name are tenant content shown in the sidebar, login and letterhead. They never tint the interface.

**Key Characteristics:**
- Light only: `color-scheme: light`; `dark:` utilities exist but nothing activates them.
- One action color (navy), one typeface (Geist), one radius (8px).
- Color carries state: green active/paid, red overdue/below passing, amber pending/recovery, gray neutral.
- White data panels with a soft drop shadow, floating on a gray-50 floor.
- Desktop-first density; lists reflow to stacked rows on phones.

## Colors

A neutral gray office with a single navy for action and a small state vocabulary.

### Primary
- **Action Navy** (`action-navy`): primary buttons ("Novo aluno", "Salvar"), the text caret, link-like emphasis. One primary button per view. The scale is `--primary-50…900` in `globals.css` (replacing Flowbite's blue); code uses `primary-*` classes, never `blue-*`.
- **Action Navy Deep** (`action-navy-deep`): primary hover.
- **Focus Navy** (`focus-navy`): input focus border and 1px ring.
- **Selection Navy** (`selection-navy`): text selection and the row being edited in place.

### Neutral
- **Ink** (`ink`): body text, headings, names in the first column.
- **Ink Soft** (`ink-soft`): table header labels.
- **Ink Muted** (`ink-muted`): help text, secondary values, input exam scores next to computed results.
- **Paper** (`paper`): the page floor, table headers, input fill, tinted "result" columns.
- **Panel** (`panel`): data panels, secondary buttons.
- **Hover Gray** (`hover-gray`): row and nav hover, active nav item.
- **Hairline** (`hairline`): dividers, secondary button border, group separators inside tables.
- **Field Border** (`field-border`): input borders.

### State
- **OK Green** on **OK Green Wash**: active, paid, approved.
- **Alert Red** (`alert-red`): grades below passing and overdue amounts; **Alert Red Deep** for error text; **Alert Red Wash** behind error alerts.
- **Caution Brown** (yellow-800): pending and "em recuperação" text on a yellow wash.

### Named Rules
**The One Navy Rule.** Navy means "you can act here" (buttons, focus, the caret, the row being edited). It is never a decorative accent or a section color, and never an icon color: icons are gray (`ink-muted` at rest, `ink` on hover).

**The Tenant Color Rule.** The school's brand colors (Único's red logo) appear only in the school's own logo and letterhead, never in buttons, nav or highlights. Another school must be able to drop in its logo without the UI clashing.

**The State Earns Color Rule.** Green, red and amber are reserved for the state of a record. A row is red because it is overdue or below passing, never for emphasis.

## Typography

**Body Font:** Geist (via `next/font`, with the system sans fallback)
**Mono Font:** Geist Mono (loaded; rarely used)
**Icons:** Material Symbols Outlined at 20px (the same set the Django templates used)

**Character:** one neutral grotesque at a few sizes. Hierarchy comes from weight and gray value, not from extra faces.

### Hierarchy
- **Headline** (600, 1.5rem/2rem): the page title, one per page ("Alunos", "Notas do aluno").
- **Title** (600, 1.125rem): section headings on detail pages. Form fieldset legends are one step down (600, 1rem), so a long form doesn't shout.
- **Body** (400, 0.875rem/1.25rem): table cells, inputs, buttons, most UI text. Names in a list's first column use 500.
- **Label** (700, 0.75rem, uppercase): table header cells (Flowbite's head style).
- **Caption** (400, 0.75rem): help text, record counts, badges.
- **Detail value** (500, 1rem) under a **Detail label** (400, 0.875rem, `ink-muted`): the label/value pairs on read-only detail pages (the student profile) and the summaries above forms. Tables and inputs stay at Body (0.875rem).

### Named Rules
**The Tabular Numbers Rule.** Any column or input of grades, money, dates or CPF uses `tabular-nums` so digits line up.

**The Reading Page Rule.** A page people open to read a record (a profile, not a list or a form) reads at 16px: values 16px/500, labels 14px, section Titles 18px. The data must outweigh the chrome around it (the 16px sidebar, the buttons). Phone numbers on these pages are 16px/600 `tel:` links with a gray `call` icon and a 44px tall target.

**The pt-BR Rule.** Everything shown is Brazilian Portuguese: comma decimals (2,50), R$ with a thousands dot, dd/mm/aaaa dates, formatted CPF/CEP.

## Layout

- **Shell:** a fixed sidebar (about 296px) on desktop with nested collapsible groups. Below the large breakpoint it becomes a top bar with a hamburger that opens the nav as a drawer.
- **Content:** fluid width, no max-width, 32px padding (16px on phones). Pages stack vertically with 16px gaps: headline, then a filter/search row, then the data panel.
- **Lists** (`<ListPage>`): headline and the primary button on one row, a search box and record count under it, then the table. Below `sm`, the table header hides and each row reflows into a wrapped card-like block with a bottom hairline.
- **Wide grids** (the grades table): scroll sideways inside the panel, with the identifying column sticky on the left.
- **Forms:** fieldsets of label-above-input fields, in a responsive grid. Inputs keep a 5rem scroll margin so a focused field clears the mobile top bar.
- **Detail pages** (the student profile): no max-width either. Sections stack on phones and pair up two-wide from `xl`, with long lists (enrollments) spanning both columns. Prose inside them (observations) keeps `max-w-prose`.
- **Print** pages (`src/app/(print)/`) drop the shell and use the school letterhead.

## Elevation & Depth

Mostly flat, with one soft lift for data. Data panels (tables) sit on a white surface with a small drop shadow over the gray floor. Page chrome is flat; forms group fields in white fieldsets with a 1px hairline border and no shadow, so they read as sections, not as data panels. Menus, comboboxes and dropdowns use Flowbite's larger shadow because they float over content.

### Shadow Vocabulary
- **Panel lift** (`filter: drop-shadow(0 3px 3px rgba(0,0,0,0.12))`): the white surface behind every table.
- **Overlay** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`): dropdowns, combobox lists, the mobile drawer.

### Named Rules
**The Soft Panel Rule.** Data lives on a white panel with the panel-lift shadow, never on a bordered box or a nested card. Inside a panel, separate groups with hairline dividers, not more shadows.

## Shapes

Gently rounded and uniform: 8px (`rounded.lg`) on buttons, inputs, panels and nav items; 4px on badges; 6px on the icon-action tooltip. No pills except where Flowbite draws them, no sharp corners, no decorative shapes. Borders are 1px hairlines.

## Components

### Buttons
- **Shape:** 8px radius; 40px tall by default, 32px (`size="xs"`) inside tables.
- **Primary:** Action Navy fill, white 14px/500 text. Hover darkens to Action Navy Deep; focus adds a 4px pale-navy ring.
- **Alternative (secondary):** white, 1px hairline border, ink text; hover turns gray-100 and the text stays ink (no navy; theme override in `src/app/layout.tsx`). Used for "Editar", "Cancelar", and row actions.
- **Icon actions:** icon-only buttons in list rows carry an `aria-label` and a `data-tip` tooltip (dark ink pill, 0.75rem, fades in on hover and focus). The icon rests in `ink-muted` (gray-500) and takes the button's color on hover/focus (`globals.css`); delete turns red on hover.
- **Pending:** a submit button disables itself and its label changes ("Salvando…") while the action runs.

### Badges
- **Style:** 12px/600 text on a pale wash of the state color, 4px radius, 2px 8px padding. Green for active/approved, yellow for pending/recovery, red for overdue/failed and enrollments ended early (transferida, desistente, cancelada), gray for "em andamento" and concluída (`<EnrollmentStatusBadge>`).

### Cards / Containers
- **Data panel:** white, 8px radius, panel-lift shadow, no border, no internal padding (the table fills it).
- **Detail section:** a data panel with padding (20px, 24px from `sm`) and an 18px Title, for one part of a record on a detail page. Same white surface and panel-lift shadow (`drop-shadow-md`), never a border.
- No decorative cards and no nested cards. Summaries above a table are an inline label/value list (Detail label over a Detail value), not a card.

### Inputs / Fields
- **Style:** Paper fill, 1px field border, 8px radius, 10px padding, 14px text. Label above the field; "(opcional)" marks optional fields.
- **Focus:** border and a 1px ring in Focus Navy; the caret is Action Navy.
- **Error:** Flowbite's failure color: red border and red help text under the field.
- **Masked fields:** CPF formats as it is typed (`mask`), shown with tabular digits.

### Navigation
- **Sidebar:** transparent on the paper floor. School logo and name at the top, user and "Sair" at the bottom. Groups are collapsible with a chevron; items carry a 20px Material Symbol.
- **States:** hover and active are gray-100 fills with an 8px radius. Only the most specific matching route is active, and its group opens automatically.
- **Mobile:** a top bar with the hamburger and the logo; the nav opens as a drawer.

### Data Table (signature)
- Uppercase 12px bold headers on Paper; 14px cells with 10px padding; rows hover gray-100.
- The first column holds the record's name in Ink at 500 weight; the actions column sits at the far right.
- Grade grids add hairline group dividers between bimesters, tint computed columns with Paper, show values below passing in Alert Red, and keep the subject column sticky.

## Do's and Don'ts

### Do:
- **Do** keep one primary (navy) button per view; everything else uses the alternative button.
- **Do** put data in the white panel with the panel-lift shadow, using `<ListPage>` / `<ListRow>` for lists.
- **Do** use `tabular-nums` and right alignment for grades, money and counts.
- **Do** use state color only for record state (paid, overdue, below passing, recovery).
- **Do** reuse Flowbite components and the house wrappers (`<FormFields>`, `TextField`, `<LinkButton>`, `<DeleteButton>`) before writing new markup.
- **Do** design lists to reflow into stacked rows below `sm`, and keep quick classroom tasks usable one-handed on a phone.

### Don't:
- **Don't** bring the school's logo colors (Único red) into buttons, nav, or highlights.
- **Don't** add a second accent color, gradients, or decorative illustrations.
- **Don't** wrap data in bordered boxes or nested cards; use the soft panel.
- **Don't** add dark-mode-only styling expecting it to show: the app is light only.
- **Don't** use red, green or amber for emphasis unrelated to a record's state.
