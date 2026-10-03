# Demo and pitch scripts

Judges watch the pitch video first (2–3 min), then the demo (≤3 min). Both
are recorded against devnet with the dev wallet so every transaction is real
and linkable.

## 30-second version

1. Run detail page, employer view: four people, four amounts, "Run payroll".
2. Rows tick from "Generating proofs" to "Paid" with explorer links.
3. Toggle "What the explorer sees": every amount becomes `••••••`.
4. Switch to Ada's phone: "Pay arrived", confirm, `$2,350.00`.
5. Auditor page: "Decrypt all transfers", four amounts recovered from chain,
   "Books match the chain".

Line to say over it: *Fourteen transfers. No amounts. Each person sees their
own. The accountant sees everything. Nobody can move a cent they shouldn't.*

## 2-minute demo (recorded)

| Time | Screen | Say |
|---|---|---|
| 0:00 | Solscan, a real public payroll wallet (blurred names) | Teams already pay in USDC. Every salary is public. |
| 0:12 | Landing hero, demo panel cycling Anyone / Ada / Auditor | Payslip hides the amount, not the payment. |
| 0:25 | Setup wizard, create step | One transaction creates a Token-2022 mint with the confidential extension and the auditor key. |
| 0:40 | Invite link on a phone, "Set up my private account" | Employee: one signature, one transaction. |
| 0:55 | Treasury: wrap USDC, move to private | USDC goes into a vault with no admin; the payroll token is backed 1:1. |
| 1:10 | Run payroll, rows ticking | Proofs are generated in the browser. The server never sees a key. |
| 1:30 | Explorer toggle, then Solscan for one signature | This is all anyone else gets. |
| 1:40 | Ada confirms receipt, decrypts `$2,350.00` | |
| 1:50 | Audit page, decrypt all, CSV export | The auditor key reads everything and spends nothing. |
| 2:00 | GitHub README | Open source. Built on Token-2022 confidential balances, live on mainnet since June. |

## Pitch video (2–3 min, face to camera + slides)

1. **Problem (20s).** Remote teams pay in USDC. Every salary is public, forever.
   Colleagues look. Competitors look. Existing stablecoin payroll inherits it.
2. **Why now (20s).** Solana re-enabled confidential balances in June 2026
   after a year of audits. Usage is near zero because wallets have not
   integrated it. Payroll owns both ends of the transfer, so it can be the
   first real user.
3. **Product (40s).** The demo panel. Three views of one run.
4. **How it is built (30s).** Per-company mint with auditor key; proofs in
   the browser; USDC vault with no admin; sign-in with Solana; resumable runs.
5. **Who it is for and how it spreads (30s).** Stablecoin-paid agencies in
   Nigeria, India, Brazil, Vietnam. Every company onboards every employee;
   every employee carries the expectation to their next job.
6. **What is next (20s).** Mainnet with an issuer-enabled stablecoin,
   Transaction V1 single-transaction transfers, fee sponsorship, local
   off-ramps. Ask: pilots with two agencies.

## Weekly update video (1 min)

What shipped this week, one real transaction link, what is next. Colosseum
strongly recommends these; post Monday.
