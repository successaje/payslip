# Architecture

## Overview

Payslip is a Next.js application with a small on-chain program. The sensitive
part of the system, generating zero-knowledge proofs for confidential
transfers, runs in the user's browser because it needs the user's ElGamal
secret key. The server never sees a key, a secret, or a decrypted amount.

```
┌─────────────────────────────┐        ┌───────────────────────────┐
│ Browser (employer/employee) │        │ Next.js server            │
│                             │        │                           │
│ wallet-standard signer      │  REST  │ route handlers (/api)     │
│ key derivation (1 sig)      │◀──────▶│ session auth (SIWS)       │
│ proof generation (WASM)     │        │ Drizzle + libsql          │
│ tx build + send (kit)       │        │ roster, invites, runs     │
└──────────────┬──────────────┘        └───────────────────────────┘
               │ JSON-RPC
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Solana                                                          │
│  Token-2022 mint per company (ConfidentialTransferMint ext.)    │
│  ZK ElGamal proof program (context-state accounts)              │
│  payslip_vault program: USDC vault PDA, wrap/unwrap             │
└─────────────────────────────────────────────────────────────────┘
```

## Trust model

| Party | Can see | Cannot |
|---|---|---|
| Public | That a transfer happened, sender, recipient, time | Any amount |
| Employee | Their own balance and payslips | Anyone else's amount |
| Auditor | Every transfer amount on the company mint | Spend, freeze, or move funds |
| Payslip server | Roster metadata the employer typed in | Keys, amounts, anything on-chain the public cannot |
| Employer | Everything they sent | Employee balances after payment |

The payroll token is backed 1:1 by USDC held in a program-owned vault. Wrapping
and unwrapping are permissionless for holders. The vault program has no admin
key over funds.

## Source layout

```
src/
  app/                  routes (App Router)
    (marketing)/        landing page
    app/                authenticated product
    join/[token]/       employee invite
    api/                route handlers
  components/
    ui/                 design system primitives
    ...                 feature components
  lib/
    solana/             rpc, signers, confidential ops, mint creation
    db/                 drizzle schema + client
    auth/               sign-in-with-Solana, session
    domain/             payroll logic independent of UI and chain
  hooks/                React hooks wrapping lib/
program/                Anchor workspace for payslip_vault
scripts/                operational scripts (devnet setup, checks)
docs/                   product, architecture, build log
```

## On-chain design

### Company payroll token

Created client-side in one transaction when the company is set up:

1. `SystemProgram.createAccount` sized for `ConfidentialTransferMint`.
2. `InitializeConfidentialTransferMint { authority, autoApproveNewAccounts: true, auditorElgamalPubkey }`.
3. `InitializeMint { decimals: 6, mintAuthority: vaultPda }`.
4. `payslip_vault::init_vault` creates the vault's USDC account.
5. The employer configures their own confidential account (the treasury).

Mint authority is the vault PDA, so only wrapping USDC can create supply. When
`NEXT_PUBLIC_VAULT_PROGRAM_ID` is unset (devnet without a deployed program),
the employer wallet is the authority and Treasury offers a labelled
"add test funds" card instead of wrapping.

### Confidential transfer lifecycle

| Step | Who | Transactions |
|---|---|---|
| Configure account | Each holder, once | 1 (plus 1 signature for key derivation) |
| Deposit public → pending | Employer after wrapping | 1 |
| Apply pending → available | Holder | 1 |
| Transfer | Employer | 1 (Transaction V1: three inline proof verifications and the transfer, atomic); the five-transaction context-state path remains as a fallback |
| Withdraw available → public | Holder | 2 |

Keys are derived with the standard derivation (one signature over
`solana-conf-bal/v1`) so accounts are readable by any standard client and by
the `spl-token` CLI.

### Vault program

`payslip_vault` has two instructions:

- `wrap(amount)`: transfer USDC from the caller to the vault PDA token account,
  mint the same amount of payroll token to the caller.
- `unwrap(amount)`: burn payroll token from the caller, transfer USDC from the
  vault to the caller.

Invariant: payroll token supply equals USDC vault balance.

## Developer wallet

`src/lib/solana/devWallet.ts` registers a wallet-standard wallet backed by two
keypairs in `localStorage`, only when `NEXT_PUBLIC_ENABLE_DEV_WALLET=true` and
the cluster is devnet. It implements the same features a real wallet does
(connect, disconnect, events, signMessage, signTransaction,
signAndSendTransaction), so the app has one code path. It exists so the whole
product can be exercised in a browser without an extension.

## Server

Route handlers under `src/app/api`. The database stores only what the chain
cannot: company names, people, emails, invite tokens, intended amounts, run
status and transaction signatures. Nothing in the database is needed to decrypt
anything.

Authentication is sign-in with Solana: the server issues a nonce, the wallet
signs a human-readable message, the server verifies the ed25519 signature and
sets an HttpOnly session cookie.

## Why these choices

- **@solana/kit** over web3.js v1: typed instruction builders, signer
  abstraction that wallet-standard plugs into, and transaction version support
  for V1.
- **@softseco/confidential-transfers** over hand-rolled proofs: it wraps the
  official `@solana/zk-sdk` WASM and the official token-2022 client, and uses
  the standard key derivation. We call it from the browser.
- **Per-company mint** over one global mint: the auditor key is a mint-level
  setting, and each company must have its own auditor.
- **libsql** over Postgres: a file in development, Turso in production, no
  infrastructure to stand up during a four-week build.
- **Hand-written vault client** over an IDL: Anchor 0.30.1's IDL generator does
  not compile on current Rust; the three instructions are small enough to
  encode directly (`sha256("global:<name>")[..8]` + Borsh `u64`).
