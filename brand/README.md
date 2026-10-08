# Payslip brand kit

Everything here is generated from the same tokens the product uses, so the
logo on a slide matches the logo in the app. SVG sources are in `logo/`;
rendered PNGs are next to them and in `social/`.

## The mark

A slip: three lines on a rounded square, the bottom line short, like the last
line of a payslip. Ink on paper by default; inverse for dark backgrounds;
green when it sits on a photo or needs to read as "money".

| File | Use |
|---|---|
| `logo/mark.svg`, `mark-1024.png`, `mark-512.png` | App icon, favicon source, avatar |
| `logo/mark-inverse.svg` + PNGs | On dark backgrounds |
| `logo/mark-green.svg` + PNGs | Accent use only |
| `logo/apple-touch-180.png` | iOS home screen |
| `logo/wordmark-light.png`, `wordmark-dark.png` | Mark + name, transparent, for slides and headers |
| `logo/logo-square-1024.png` | The "product logo or graphic" for submissions and directories |

Clear space around the mark: one bar-height on every side. Minimum size: 16 px.
Do not recolour the lines, rotate the mark, or put it on a busy background.

## Social

| File | Size | Use |
|---|---|---|
| `social/og.png` | 1200×630 | Link previews (also served live at `/opengraph-image`) |
| `social/banner.png` | 1500×500 | X / Twitter header |
| `social/cover.png` | 1920×1080 | Title card for the pitch and demo videos |

Regenerate any of these from a running dev server:

```bash
npm run brand:render
```

## Colour

Paper and ink, with one green that means "settled" and nothing else.

| Token | Light | Dark | Meaning |
|---|---|---|---|
| paper | `#f7f6f2` | `#121211` | background |
| paper-raised | `#ffffff` | `#1a1917` | cards |
| ink | `#171614` | `#f1efe9` | text, the mark |
| ink-2 | `#4d4a44` | `#b9b5ac` | secondary text |
| ink-3 | `#85817a` | `#807c74` | labels |
| line | `#e2dfd7` | `#2a2926` | hairlines |
| green | `#0f6b4f` | `#4cc39a` | paid, verified, live |
| amber | `#9a6400` | `#e2b35c` | waiting |
| red | `#b3261e` | `#ff7b72` | failed, mismatch |
| blue | `#2b4fd8` | `#8aa2ff` | informational |

## Type

- **Instrument Serif** for headlines on the landing page, slides and covers.
- **Instrument Sans** for everything else, 600 for the wordmark.
- **JetBrains Mono** for amounts, addresses and signatures, always with
  tabular numerals. The redacted amount is six bullets: `••••••`.

Both Instrument faces and JetBrains Mono are on Google Fonts under the OFL.

## Voice

- Say "payout", not "transaction". Say "private", not "confidential", except
  when naming the Solana extension.
- Amounts are the thing we hide. Payments are not hidden; they are visible on
  the chain with no amount. Say exactly that.
- One claim, repeated: the only payout tool where the amounts are not public.
- Never "revolutionary", "seamless", "unlock". Prefer the number: one
  transaction, one signature, under a second.

## One-liners

- Pay your people in USDC. Keep the amounts off the public ledger.
- Private payouts on Solana.
- Recipient sees their number. Auditor sees every number. Everyone else sees ••••••.
