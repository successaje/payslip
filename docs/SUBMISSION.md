# Colosseum submission: Crypto World's Fair 2026

> Working document for filling the form. Not product copy. Delete or keep;
> it contains nothing secret.

Deadline **12 October 2026, 23:59 PT** (13 October, 07:59 WAT). Submit at
colosseum.com/worldsfair. Track: **Solana** only. One submission per team.

Every field below is drafted to paste. Items marked **[you]** need a fact
only you have. Keep the repo public from the moment you submit; the form
accepts a private repo only if `hackathon@colosseum.com` is granted access.

## What the form asks for

From Colosseum's hackathon page and workshop notes:

- Product name, brief description
- Blockchains and tools integrated
- Teammates, backgrounds, experience; team location
- Product logo or graphic
- GitHub repository
- Presentation (pitch) video, 2–3 minutes
- Product demo video, up to 3 minutes, how it works and how it is built
- Go-to-market, demand validation, distribution

Judging: founder-market fit, insight, product and execution, market size,
founder communication, viability, traction. The pitch video is reviewed first.
Only work inside 14 Sep – 12 Oct counts; the whole repo is inside the window.

## Fields (paste-ready)

**Product name**
Payslip

**Tagline**
Pay your people in USDC. Keep the amounts off the public ledger.

**Short description** (under 300 characters)
Private payouts on Solana. Salaries, invoices, grants and bounties in one USDC batch, every amount encrypted on-chain with Token-2022 confidential balances. The recipient reads their number, the auditor reads every number, everyone else sees a payment with no amount.

**Description**
Crypto-native teams, DAOs and grant programs already pay people in USDC. Every one of those payouts is public, forever. Colleagues compare salaries, grantees compare tranches, competitors read your burn. Payroll software cannot fix it, because the leak is the chain, not the app.

Solana re-enabled confidential balances in June 2026 after a year of audits. Almost nobody uses them: when we started, we counted four transactions in four days. Wallets have not integrated the extension. Payroll owns both ends of a transfer, so it is the one product that can make the primitive useful without waiting for wallets.

Payslip is that product. A workspace creates its own Token-2022 payout token with the confidential extension and the auditor's ElGamal key fixed at creation. USDC goes into an on-chain vault with no admin and comes out 1:1 as the payout token; supply always equals USDC held. People are invited one by one, imported from CSV, or register themselves through a public link, which is how bounty boards and grant programs pay people they did not know in advance. Each recipient connects a wallet and registers a confidential account with one signature and one transaction. A batch pays everyone who is set up.

Each payout is a single Transaction V1 carrying three zero-knowledge proofs (equality, validity, range) and the transfer, verified atomically: 2,395 bytes, 238,484 compute units, confirmed in about one second on devnet. The standard client needs five transactions and temporary rent for the same transfer. We believe Payslip is the first product to settle a confidential transfer this way.

Recipients see "Pay arrived" within seconds of it landing, confirm with one signature, and can verify every statement by decrypting the recipient handle of the on-chain proof with their own key. The auditor decrypts every transfer from the chain, compares it with the books, and exports a CSV. Payslip's server holds names, amounts the payer typed, and invite links. It never holds a key and never sees a decrypted balance.

Everything in the demo is real and linkable on devnet: workspace setup, invites, the public claim link, CSV import, vault wrap, single-transaction payouts, recipient verification, auditor decrypt.

**Blockchains**
Solana

**Tools and technologies**
Token-2022 confidential transfer extension; ZK ElGamal Proof program (inline verification); Transaction V1; an Anchor vault program (`AjfdhEkypXPzBfxHL4rhX9UNMpzWbD51D56U8XVhcX2L` on devnet) that wraps USDC 1:1 with a PDA mint authority and no admin; @solana/kit; wallet-standard with Sign-in with Solana; @solana/zk-sdk in the browser; Next.js 16, Drizzle, libsql/Turso.

**Repository**
https://github.com/successaje/payslip

**Product logo**
`brand/logo/logo-square-1024.png`

**Team**
Success Aje, founder and engineer. **[you: two sentences. Where you are based, what you have shipped before, and the one line that makes this problem yours, for example being paid in stablecoins yourself or having run payouts for a community.]** Solo for the hackathon; every line of Payslip, the vault program and the single-transaction confidential transfer was built inside the window, 3 to 12 October 2026.

**Team location**
**[you: city, country]**

**Go-to-market**
Wedge: bounty boards, grant programs and DAOs on Solana that publish every amount today. Superteam Earn alone has paid $10.3M in public bounties. They already have the payer, the recipients and the USDC; they lack only privacy, and the public claim link means a program onboards recipients without a roster. Second segment: stablecoin-paid agencies and distributed teams in Nigeria, India, Brazil and Vietnam, where Rise reports more than half of contractor withdrawals in stablecoins and salaries are sensitive. Distribution is built into the product: every payer onboards every recipient, and every recipient carries the expectation to their next client. Pricing: free on devnet, a flat fee per recipient per batch on mainnet, never a cut of the money.

**Demand validation**
**[you: one or two conversations, quoted with permission. If none yet, leave this honest: "Talking to grant and bounty operators now; first mainnet pilot targeted for November."]**

**Traction**
Working end to end on devnet since 3 October: setup, invites, public claim link, CSV import, vault wrap and unwrap, single-transaction confidential payouts, recipient pay-arrived detection and chain verification, auditor decrypt and CSV. Real devnet signatures in the README and build log, including a November 2026 batch paid in one Transaction V1 per recipient. Minimal mainnet payout script rehearsed on devnet for 0.008 SOL end to end. **[you: add the mainnet signature if you ran it.]**

**What is next**
Mainnet with the vault (program rent is the only cost). Fee sponsorship so recipients never need SOL. Statements and accountant access on top of the auditor key. Local off-ramps through partners. A confidential-payout SDK so other payroll and bounty products can compose with it instead of rebuilding it.

**Links**
Demo GIF: https://github.com/successaje/payslip/blob/main/docs/media/demo.gif
Changelog: in the app at /changelog · Build log: docs/BUILD_LOG.md · Architecture: docs/ARCHITECTURE.md

## Pitch video script (2:30, face to camera or voice over slides)

Record in one take if you can. Loom is fine. Cover slide:
`brand/social/cover.png`.

0:00 **Hook (15 s).** "If your team is paid in USDC, everyone on earth can
read every salary. Not your bank, not your competitor: everyone. Payslip is
the only payout tool where the amounts are not public."

0:15 **Who I am (20 s).** **[you]** Name, where you are, what you have built
before, why this problem is yours.

0:35 **Problem (25 s).** DAOs, grant programs and crypto-native teams pay in
USDC because it is instant and global. Every amount is on a public ledger
forever. Bounty boards publish every prize; grantees compare tranches;
competitors read headcount cost. Deel cannot fix it. The leak is the chain.

1:00 **Insight (25 s).** Solana shipped confidential balances in June. Almost
nobody uses them: we saw four transactions in four days. Wallets have not
integrated it. Payroll owns both ends of the transfer, so it does not need
the wallets. That is why this product, and why now.

1:25 **Product (35 s).** Show the landing demo panel: one batch, three views.
Recipient sees their number. Auditor sees every number. Everyone else sees
six dots. Say: each payout is one transaction with three zero-knowledge
proofs inside, under a second. Recipients self-register through a link, see
pay the moment it lands, and verify every statement against the chain. The
auditor reads everything and spends nothing.

2:00 **Market and go-to-market (20 s).** 888,000 daily active stablecoin
addresses; $10.3M of public bounties on Superteam Earn alone; Rise reports
over half of contractor withdrawals in stablecoins. Wedge: bounty and grant
programs that already have payer, recipients and USDC. Each payer onboards
every recipient.

2:20 **Ask and vision (10 s).** Mainnet next, then the SDK every payout
product can compose with. Pilots with two programs are the ask.

## Demo video script (≤3:00, screen recording)

Follow `docs/media/demo.gif` beat for beat, narrated. Cover slide, then:

0:00 Landing, demo panel: Ada, Anyone, Auditor. "Three views of the same
batch."
0:20 Overview, People: salaries, a bounty, a grant; two imported from CSV;
the public link. "Nobody is paid until they connect a wallet and register a
confidential account: one signature, one transaction."
0:50 Treasury: wrap USDC through the vault, move to private. "The vault has
no admin. Supply equals USDC held."
1:10 New batch, Send payouts. Rows go from Generating proofs to Paid.
"Proofs are built in the browser. Each payout is one Transaction V1: equality
proof, validity proof, range proof, transfer. 2.4 kilobytes, 240k compute
units, one second."
1:40 What the explorer sees, then the chain receipt. "This is all anyone else
gets."
2:00 Ada's home: Pay arrived, confirm, balance. Statements: Verified on-chain.
"She decrypts the recipient handle of the proof with her own key."
2:25 Audit: Decrypt all, books match, export CSV.
2:45 Architecture card (one slide): per-company mint with auditor key, vault
program, proofs in browser, server holds names and invite links only.

## Checklist for submission day

- [ ] Repo public, README renders the GIF, build log current
- [ ] Both videos uploaded (YouTube unlisted or Loom), links tested logged out
- [ ] Logo uploaded (`brand/logo/logo-square-1024.png`)
- [ ] Every **[you]** above replaced
- [ ] Mainnet signature added if the minimal run was done
- [ ] Live URL if deployed
- [ ] Submit before 12 Oct 23:59 PT, then post the weekly update video
