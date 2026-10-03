# Payslip

**Private stablecoin payroll on Solana.** Salaries are hidden on-chain, readable
only by the employee who received them and the auditor the company designates.

> Built for Colosseum's Crypto World's Fair (September–October 2026). Not
> audited. Do not run real payroll with it yet.

## The problem

Remote teams already pay in USDC. The transfer is instant and cheap, and every
salary is public. Anyone who finds the company's wallet can read what each
colleague earns, forever. Existing stablecoin payroll products inherit this
leak. The only fixes today are juggling many wallets or going back to the bank.

## What Payslip does

The employer keeps a roster and presses **Run payroll**. Every employee is paid
in one batch using Solana Token-2022 **confidential balances**: the transfer is
on-chain, the amount is encrypted. Each employee decrypts only their own pay.
The company's auditor holds a key that decrypts every transfer and spends
nothing. The explorer shows that payroll happened, and nothing else.

## How it works

1. The company creates a payroll token: a Token-2022 mint with the confidential
   transfer extension and the auditor's public key, backed 1:1 by USDC in a
   program vault.
2. Each employee configures a confidential account once (one signature derives
   their keys, one transaction registers the account).
3. The employer wraps USDC into the payroll token and runs payroll. Proofs are
   generated in the browser; the server never sees a key or an amount.
4. Employees see their balance, and can withdraw to plain USDC at any time.
5. The auditor decrypts amounts directly from transaction signatures.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product model and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the technical design.

## Solana technology used

| Capability | Where |
|---|---|
| Token-2022 `ConfidentialTransferMint` with auditor ElGamal key | `src/lib/solana/mint.ts` |
| Confidential configure, deposit, transfer, withdraw (ZK proofs in WASM) | `src/lib/solana/confidential.ts` |
| Auditor decryption from a transaction signature | `src/lib/solana/audit.ts` |
| USDC vault program (`payslip_vault`) | `program/` |
| Wallet-standard signing via `@solana/kit` | `src/lib/solana/signers.ts` |

A reproducible devnet run of the full flow lives in `scripts/spike.ts`.

## Local development

Requirements: Node 20.9+, npm.

```bash
cp .env.example .env.local   # fill in SESSION_SECRET and an RPC URL
npm install
npm run db:push
npm run dev
```

Open http://localhost:3200.

### Environment variables

Documented in [.env.example](.env.example).

### Tests

```bash
npm test
```

### Program

```bash
cd program
anchor build
anchor test
```

## Deployment

The app deploys to Vercel. The database is Turso (libsql). Set the variables
from `.env.example` in the project settings.

## Repository structure

```
src/app         routes
src/components  UI
src/lib         solana, db, auth, domain logic
src/hooks       React hooks
program         Anchor workspace
scripts         operational scripts
docs            product model, architecture, build log
```

## License

MIT.
