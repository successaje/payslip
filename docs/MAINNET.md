# Mainnet run

The first real payout, with real USDC, on Solana mainnet. Everything here is
written so that a person signs every transaction that moves value. Nothing
in this repository can spend from your wallet on its own.

## What it costs

| Item | Who pays | Approx. |
|---|---|---|
| Deploy `payslip_vault` (249,768 bytes) | deploy wallet | 1.27 SOL rent, refundable if the program is ever closed, plus ~0.01 SOL fees |
| Create the payout mint with the confidential extension | payer wallet | ~0.004 SOL |
| Treasury confidential account | payer wallet | ~0.003 SOL |
| Each recipient's confidential account | recipient wallet | ~0.003 SOL |
| Each payout (one Transaction V1, ~2.4 KB, ~240k CU) | payer wallet | ~0.00002 SOL + priority fee |
| USDC to wrap | payer wallet | whatever you choose to pay out; $5 is enough for the first run |

Budget 1.6 SOL on the deploy wallet and 0.05 SOL on each wallet that takes
part. Program rent comes back if you close the program later.

## Before you start

```bash
npm run preflight:mainnet
```

Read-only. It checks the RPC, that Token-2022 and the ZK ElGamal Proof
program are live, that USDC is Circle's mint, whether the vault program is
deployed and who can upgrade it, and whether the deploy wallet holds enough
SOL. Pass `RPC_URL=` for a keyed endpoint and `WALLET=` to check a wallet
other than the Solana CLI default. Fix every ✗ before continuing.

## 1. Deploy the vault program

The program keypair in `program/target/deploy/` is the same one used on
devnet, so the mainnet address is `AjfdhEkypXPzBfxHL4rhX9UNMpzWbD51D56U8XVhcX2L`
too. The `.so` there is the build that was verified on devnet; rebuild only
if you changed the program (`anchor build --no-idl` in `program/`).

```bash
solana config set --url <your keyed mainnet RPC>
solana balance            # needs >= 1.6 SOL
```

```bash
solana program deploy program/target/deploy/payslip_vault.so \
  --program-id program/target/deploy/payslip_vault-keypair.json \
  --upgrade-authority ~/.config/solana/id.json \
  --with-compute-unit-price 10000 \
  --max-sign-attempts 50
```

If the deploy is interrupted, it prints a buffer address and a recovery
command; run that rather than starting over (the devnet deploy needed this).
Then:

```bash
solana program show AjfdhEkypXPzBfxHL4rhX9UNMpzWbD51D56U8XVhcX2L
```

Keep the upgrade authority on a wallet you control until the program has
been reviewed. Making it immutable (`solana program set-upgrade-authority
--final`) is a one-way step; do it only when you mean it.

## 2. Run the app against mainnet

```bash
cp .env.mainnet.example .env.mainnet.local
```

Fill in the RPC URLs and a fresh `SESSION_SECRET`, then:

```bash
npm run db:push:mainnet
```

```bash
npm run dev:mainnet
```

The app serves on <http://localhost:3201> with its own database, so mainnet
workspaces never mix with devnet test data. The developer wallet does not
register on mainnet; connect Phantom, Solflare or any wallet-standard wallet.

## 3. The run itself

Use two wallets: the payer (also the auditor for the first run) and one
recipient. A phone wallet for the recipient makes the demo honest.

1. **Payer.** Open the app, connect, sign in. Setup: name the workspace, keep
   "Me, for now" as auditor, create the payout token. One transaction.
2. **Payer.** People → Add person, amount `1.00`. Copy the invite link.
3. **Recipient.** Open the link, connect, sign in, register. One signature,
   one transaction.
4. **Payer.** Treasury → Wrap `5.00` USDC, then Move to private `5.00`.
5. **Payer.** Payouts → New batch → Send payouts. Watch the row go to Paid.
   Open the signature: the receipt shows Transaction v1, three proofs and the
   transfer, no amount anywhere.
6. **Recipient.** The home page says Pay arrived. Confirm receipt, reveal
   `$1.00`. Statements → Verify: "Verified on-chain".
7. **Payer.** Audit → Decrypt all transfers: `$1.00` on-chain, `$1.00`
   recorded, books match. Export CSV.
8. **Recipient.** Withdraw to spendable, then Unwrap to plain USDC. Confirm
   in the wallet that USDC arrived.

Note the signatures. Each one is a public, permanent record of a payout with
no amount on it.

## 4. After the run

- Put the signatures and the mint address in `docs/BUILD_LOG.md` and the
  changelog.
- Flip the copy: the landing hero's "Devnet today", the FAQ answer about
  mainnet, the README status line.
- Leave the vault with only what you intend to pay out. Unwrap the rest.

## If something fails

- **"Not enough private balance"**: funds are wrapped but still public. Move
  to private first.
- **Transfer simulation fails with a size or account-data error**: the RPC is
  not Transaction V1 aware. Use a keyed endpoint; the runner falls back to the
  five-transaction path automatically but that path needs ~0.02 SOL of
  temporary rent per payout.
- **Recipient cannot verify a statement**: they need the same wallet that
  registered; the key is derived from its signature.
- **Rate limits**: the public RPC returns 429 under proof traffic. Keyed RPC.
