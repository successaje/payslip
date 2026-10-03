# Design system

Payslip looks like a well-made financial document, not a crypto dashboard.
Paper background, ink text, one green for "private and confirmed", tabular
mono for every number. No gradients, no glow, no purple.

## Tokens

Defined once in `src/app/globals.css` as CSS custom properties and exposed to
Tailwind through `@theme inline`. Components use the semantic names only.

| Role | Light | Dark |
|---|---|---|
| `paper` / `paper-raised` / `paper-sunken` / `paper-inset` | warm off-white surfaces | near-black surfaces |
| `ink`, `ink-2`, `ink-3`, `ink-4` | text from primary to disabled | inverted |
| `line`, `line-strong` | hairlines and input borders | |
| `green`, `green-soft`, `green-ink` | confirmed, private, success | |
| `amber`, `amber-soft` | pending, needs attention | |
| `red`, `red-soft` | failed, destructive | |
| `blue`, `blue-soft` | informational | |

Dark mode is a full token redefinition under `[data-theme="dark"]`, chosen by
`ThemeScript` before first paint from `localStorage` or the system preference.

## Type

- UI: Instrument Sans, 15px base, 1.5 line height.
- Display (landing headlines only): Instrument Serif.
- Numbers, addresses, signatures: JetBrains Mono with tabular numerals (`.tnum`).

Scale: 12 / 12.5 / 13 / 13.5 / 14 / 15 / 16 / 20 / 34 px. Headlines on the
landing page may go larger; product screens stay at or below 34px.

## Spacing and radius

4px grid. Component padding 12–20px. Section gaps 24–40px. Radius: 4 (badges,
inputs' inner), 8 (buttons, inputs), 12 (cards), 16 (dialogs).

## Layout

- App content column: max 1040px, 16px side gutter on phones, 24px from `md`.
- Landing column: max 1120px.
- Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Navigation: sidebar from `lg`, top bar with a sheet below.

## Motion

- Durations: 120ms (hover), 200ms (enter), 360ms (page/stagger).
- Easing: `--ease-out` for entrances, `--ease-in-out` for layout.
- Dialogs scale from 0.98 and rise 24px. Toasts rise 16px. Steps tick with a
  check that scales in.
- Everything respects `prefers-reduced-motion`.

## Primitives

`src/components/ui`: Button, Input/Textarea, Card, Badge, Dialog, Toast,
Skeleton, EmptyState, Stepper, Amount, Spinner. Each is a thin component with
the variants the product actually uses. Add a variant when a second screen
needs it, not before.

## Rules

- Amounts are never rendered outside `Amount`.
- Hidden amounts render as `••••••`, never as `$0.00`.
- Every empty state says why it is empty and what to do.
- Every asynchronous button has a `loading` state with a verb-led label.
- No raw signatures or addresses in body text; use the `Address` and
  `Signature` components with copy and explorer actions.
