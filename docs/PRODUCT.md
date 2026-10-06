# Payslip product model

This document is the north star for every screen and every commit. If a feature
does not serve one of the flows below, it does not ship.

## Thesis

Teams, DAOs and grant programs already pay people in USDC: salaries, contractor
invoices, grant tranches, bounty prizes. Every one of those payouts is public.
Anyone who finds the paying wallet can read what each person received, forever.
Bounty boards and DAOs publish every amount today because there has been no
alternative. Web2 payroll (Deel, Remote, Rippling) cannot fix this: the
transparency comes from the chain, not the app.

Payslip sends payouts on Solana Token-2022 **confidential balances**. Transfers
land on-chain with the amount encrypted. Each recipient can decrypt only their
own. The payer's designated auditor can decrypt every transfer without being
able to spend. The explorer shows that payouts happened and nothing else.

One sentence: **the only payout tool where the amounts are not public.**

## Core user

Whoever runs the money for a 5 to 500 person crypto-native organisation: an
ops lead at an agency paid by clients in USDC, a DAO treasurer paying
contributors, a grant program disbursing tranches, a community paying bounty
winners. They already hold USDC. They do not need convincing to pay on-chain;
they need the amounts to stop being public.

Secondary users:

- **Recipient.** Gets paid, wants to see the number and move it to spendable
  USDC. Should never need to learn anything about ElGamal.
- **Auditor.** Accountant, finance lead, or grants committee. Needs complete
  amounts for a period and proof they came from chain.

## Core action

**Send a batch.** Keep a roster, press one button, everyone is paid privately.

Everything else exists to make that action possible (setup, funding, invites,
CSV import for rosters that already live in a spreadsheet)
or to make its result useful (recipient balance, auditor report, history).

## Product loop

Payouts recur: monthly salaries, weekly bounties, milestone tranches. The payer
returns every cycle. Recipients return to see money land and withdraw. Every new
recipient gets an invite link and becomes a holder with a private balance. When
a contractor moves to the next client, the first question is whether that client
uses Payslip.

## Magical interaction

Side by side: the public explorer showing a batch of transfers with no amounts,
and one recipient's phone showing exactly one decrypted number, theirs. Then
the auditor view decrypting all of them from the same signatures.

"Oh. So nobody can see it, but the accountant can."

## Sponsor relevance

- **Token-2022 confidential transfer extension.** Re-enabled on Solana mainnet
  in June 2026 after a year disabled. Usage is near zero because wallets have
  not integrated it. Payslip owns both ends of the transfer, so it can be the
  first real user.
- **Auditor ElGamal key.** Native to the mint. Selective disclosure without a
  side channel or a trusted server.
- **Transaction V1.** Live since 15 September 2026. Raises the transaction size
  to 4,096 bytes so a full confidential transfer can fit in one atomic
  transaction instead of five.
- **Solana** is the only chain where this exists at the token-program level.

## Essential flows

### First visit

Landing page. The demo panel shows one batch three ways: Anyone, a recipient,
the auditor. Primary action: "Send private payouts". Secondary: "See how it
works".

### Payer onboarding

1. Connect wallet.
2. Sign in (one signature, no gas).
3. Name the workspace (a company, a DAO, a grant program).
4. Choose the auditor wallet (self by default; changeable later only by
   creating a new payout token, and the UI says so).
5. Payslip creates the payout token: a Token-2022 mint with the confidential
   extension and the auditor key, mint authority held by the vault PDA, the
   vault's USDC account opened, the payer's own confidential account prepared.
   Staged progress; one signature and three transactions.
6. Land on the overview. Until the first payout it is a checklist: add
   people, fund the treasury, send a batch. Each step is ticked from real
   state (active recipients, vault balance, completed runs), never from a
   flag. Afterwards it shows people ready, batch total, vault backing, the
   last batch and the recent batches.

### Recipient onboarding

1. Open invite link `/join/<token>`.
2. See who invited them and what Payslip is, in three lines.
3. Connect wallet. Sign in.
4. One signature derives keys; one transaction registers the confidential
   account for the workspace's payout token.
5. "You're set up. Payouts will appear here."
6. From then on the home page watches the account on-chain while the tab is
   open (every 20 s, paused when hidden). An incoming transfer raises the
   account's pending-credit counter; the page shows "Pay arrived" with a
   one-click confirm, refreshes statements and flags the tab title. Only a
   public counter is read, never the amount.
7. Statements can be verified: each row decrypts the recipient handle of the
   transfer's validity proof with the wallet-derived key and compares it with
   the recorded amount. "Verified on-chain" when equal, the chain's figure in
   red when not. Works for Transaction V1 (proof inline) and for older
   multi-transaction transfers (proof in a companion transaction).

### Open registration (bounties, grants)

When the payer does not know the recipients upfront, they turn on the
workspace's public link `/claim/<token>` from People, optionally labelled
("Q4 documentation bounties"). Anyone can open it, connect a wallet, register
a confidential account and send a request with their name and what it is for.
Requests appear at the top of People; the payer approves each one with an
amount, or declines it. Nothing is sent until approval. The link can be
rotated or turned off at any time without affecting people already approved.

### Primary action: send a batch

1. Review the roster: who gets paid, how much, who is not yet set up (skipped).
2. Treasury check: private balance must cover the batch. If short, fund first.
3. Press "Send payouts".
4. Staged progress per person: generating proofs, waiting for signature,
   submitted, confirming, paid. Failures are isolated and retryable without
   paying anyone twice.
5. Result: a batch record with every signature, explorer links, and the
   explorer-view toggle that redacts every amount.

### Funding

Wrap USDC into the payout token through the vault (1:1, no admin), move it to
the private balance.

### Result and history

Batch detail with "what the explorer sees". Recipient: statements by period,
balance decrypted locally. Auditor: every transfer decrypted from chain,
compared with the books, CSV export.

### Error recovery

- Wallet rejected signature: nothing happened, try again.
- Insufficient treasury: fund, then resume the batch.
- RPC failure mid-batch: resumable; paid people stay paid.
- Recipient not configured: skipped with a "resend invite" action.

### Returning user

Payer lands on the overview: treasury balance, people awaiting setup, last
batch. Recipient lands on their balance with the most recent statement.

## What we are not building (yet)

Tax filings, local off-ramps, a general wallet, a card, scheduling automation,
multi-token payouts, agent integrations. Each is a roadmap item, not a demo
feature.
