# Payslip product model

This document is the north star for every screen and every commit. If a feature
does not serve one of the flows below, it does not ship.

## Thesis

Stablecoin payroll is already normal for remote teams. It has one defect nobody
has fixed: every salary is public. Anyone who can find the company's wallet can
read what every colleague earns, forever.

Payslip runs payroll on Solana Token-2022 **confidential balances**. Transfers
land on-chain with the amount encrypted. Each employee can decrypt only their
own pay. The company's designated auditor can decrypt every transfer without
being able to spend anything. The explorer shows that payroll happened and
nothing else.

One sentence: **salaries hidden from the world, visible to the employee and the
auditor.**

## Core user

The founder or operations lead of a 5 to 50 person team that pays in USDC. They
are not a crypto expert. They have a wallet because clients pay them into it.
Today they either send payroll from one wallet (public) or juggle many wallets
(painful).

Secondary users:

- **Employee.** Receives pay, wants to see the number and move it to spendable
  USDC. Does not want to learn anything about ElGamal.
- **Auditor.** Accountant or finance lead. Needs the complete amounts for a
  period, and needs to prove to a third party that they got them from chain.

## Core action

**Run payroll.** Upload or maintain a roster, press one button, every employee is
paid privately in one batch.

Everything else exists to make that action possible (onboarding, funding,
invites) or to make its result useful (employee balance, auditor report,
history).

## Product loop

Payroll recurs. Every month the employer returns to run it. Every employee
returns to see pay land and withdraw. Each new hire gets an invite link and
becomes a wallet holder with a private balance. When an employee moves to
another company, the first question is whether that company uses Payslip.

## Magical interaction

Side by side: the public explorer showing twelve transfers with no amounts, and
the employee's phone showing exactly one decrypted number, theirs. Then the
auditor view decrypting all twelve from the same transaction signatures.

"Oh. So nobody can see it, but the accountant can."

## Sponsor relevance

- **Token-2022 confidential transfer extension.** Re-enabled on Solana mainnet in
  June 2026 after a year disabled. Usage is near zero because wallets have not
  integrated it. Payslip owns both ends of the transfer, so it can be the first
  real user.
- **Auditor ElGamal key.** Native to the mint. Selective disclosure without a
  side channel or a trusted server.
- **Transaction V1.** Live since 15 September 2026. Raises the transaction size
  to 4,096 bytes so a full confidential transfer can fit in one atomic
  transaction instead of five.
- **Solana** is the only chain where this exists at the token-program level.

## Essential flows

### First visit

Landing page. One screenshot-style demonstration: public explorer on the left,
employee view on the right. Primary action: "Run private payroll". Secondary:
"See how it works".

### Employer onboarding

1. Connect wallet.
2. Sign in (one signature, no gas).
3. Name the company.
4. Choose the auditor wallet address (can be their own for now; changeable
   later only by creating a new payroll token, and the UI says so).
5. Payslip creates the company's payroll token: a Token-2022 mint with the
   confidential extension and the auditor key, backed 1:1 by USDC in a program
   vault. Staged progress, one signature.
6. Land on the company overview with a clear next step: add people.

### Employee onboarding

1. Open invite link `/join/<token>`.
2. See who invited them and what Payslip is, in two sentences.
3. Connect wallet.
4. Sign in.
5. One transaction configures their confidential account for the company's
   payroll token (one signature to derive keys, one to send). The employer's
   treasury pays the rent.
6. Land on "You're set up. Pay will appear here."

### Primary action: run payroll

1. Review the roster: who gets paid, how much, who is not yet set up (and so
   cannot be paid this run).
2. Check treasury balance against the total. If short, fund first.
3. Press "Run payroll".
4. Staged progress per employee: preparing proofs, waiting for signature,
   submitted, confirming, paid. The whole batch moves through; failures are
   isolated and retryable without re-paying anyone.
5. Result: a run record with every signature, explorer links, and the sentence
   "Amounts are not visible on-chain."

### Confirmation and loading

Every signature prompt is preceded by a line saying what is about to be signed
and whether it moves money. Proof generation runs in the browser and takes a
few seconds per employee; the UI says so.

### Result

Run detail: list of payments with status, signature, time. Public view toggle:
"what the explorer sees" vs "what you see".

### History

Payroll runs by month. Employee: payslips by month, each with a decrypt button
(decryption happens locally, nothing is sent).

### Error recovery

- Wallet rejected signature: nothing happened, try again.
- Insufficient treasury: fund, then resume the run.
- RPC failure mid-batch: the run is resumable; paid employees stay paid.
- Employee not configured: excluded from the run with a "resend invite" action.
- Wrong network: detected before any signature.

### Returning user

Employer lands on the overview: next payroll suggestion, treasury balance,
people awaiting setup, last run. Employee lands on their balance with the most
recent payslip.

## What we are not building (yet)

Tax filings, local off-ramps, a general wallet, a card, scheduling automation,
multi-token payroll, agent integrations. Each is a roadmap item, not a demo
feature.
