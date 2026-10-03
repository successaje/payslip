# payslip_vault

Backs a company's confidential payroll token 1:1 with USDC. No admin, no
upgrade authority over funds, three instructions.

| Instruction | Who | Effect |
|---|---|---|
| `init_vault` | anyone, once per payroll mint | Creates the vault's USDC account (ATA of the vault PDA). Requires the payroll mint's authority to be the vault PDA. |
| `wrap(amount)` | a holder | Transfers `amount` USDC from the caller to the vault and mints `amount` payroll token to the caller. |
| `unwrap(amount)` | a holder | Burns `amount` payroll token from the caller and transfers `amount` USDC from the vault to the caller. |

## Invariant

`payroll_mint.supply == vault_usdc.amount`. Supply can only be created by
`wrap` and destroyed by `unwrap`, and both move the same amount of USDC in
the opposite direction in the same transaction.

## Accounts

- Vault authority PDA: seeds `["vault", payroll_mint]`. Signs mints and vault
  transfers. Holds no data.
- Vault USDC: the classic-token associated token account of the PDA for the
  USDC mint.
- The payroll token is Token-2022 (confidential-transfer extension); USDC is
  the classic token program. Both are handled through `token_interface`.

## Build

```bash
anchor build --no-idl
```

Anchor 0.30.1's IDL generator does not compile on current stable Rust
(`proc_macro2::Span::source_file` was removed), so the app uses a hand-written
client (`src/lib/solana/vault.ts`) with discriminators computed from the
instruction names. The program binary builds fine.

## Deploy

```bash
solana program deploy target/deploy/payslip_vault.so --program-id target/deploy/payslip_vault-keypair.json --url devnet
```

Then set `NEXT_PUBLIC_VAULT_PROGRAM_ID` in the app's environment. When it is
unset, the app falls back to the employer wallet as mint authority and offers
a devnet-only "add test funds" card instead of wrapping.

## Program ID

Devnet: see `Anchor.toml` and `NEXT_PUBLIC_VAULT_PROGRAM_ID` in `.env.example`.
