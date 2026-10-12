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

**Live app**
https://payslip-sol.vercel.app (devnet; the built-in developer wallet lets a judge try payer, recipient and auditor in one browser)

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

## Public fields, founder voice

**What are you building, and who is it for?**
Payslip is private payouts on Solana. You pay your people in USDC, salaries, contractor invoices, grants, bounties, in one batch, and the amounts never appear on the public ledger. The person you paid can read their own number with their wallet. The auditor you named when you set up the workspace can read every number and cannot move a cent. Everyone else sees a payment with no amount on it. It is for the teams who already live on-chain and have quietly accepted that their payroll is public: DAOs paying contributors, grant programs disbursing tranches, bounty boards announcing winners, remote agencies in Lagos, Bangalore or São Paulo paying a distributed team in USDC. They do not need another payroll system. They need the one they have to stop broadcasting what everyone earns. A payer sets up in a minute, people join with one signature and one transaction, each payout settles in a single transaction with the proofs inside, and the recipient sees "Pay arrived" the moment it lands.

**Why did you decide to build this, and why now?**
Because getting paid in crypto should not cost you your privacy, and right now it does. I watched a friend's bounty amount get compared against a teammate's within an hour of the link going up. Nobody meant any harm; the ledger just does that. Every team paying in USDC lives with it: your rate, your raise, the grant you fought for, visible to anyone forever. Web2 payroll cannot fix it because the leak is the chain. Then two things happened on Solana that almost nobody acted on. Confidential balances came back in June after a year of audits, and I counted four transactions in four days of use because wallets had not integrated them. And Transaction V1 landed in September, making a confidential transfer with all its proofs fit in one transaction instead of five. Payroll owns both ends of a transfer, so it does not need the wallets. The primitive was built, shipped and sitting there. Someone had to be the first real user. I would rather it be a product that pays people than a trading tool.

**What technologies are you using or integrating with?**
Solana, all the way down. Token-2022 with the confidential transfer extension for the payout token, with the auditor's ElGamal key fixed when the mint is created. The ZK ElGamal Proof program for the equality, validity and range proofs, verified inline in the same transaction as the transfer using Transaction V1, which is what gets a payout to one transaction, about 2.4 KB and 240k compute units. An Anchor program, payslip_vault, that wraps USDC one to one into the payout token with a PDA as mint authority and no admin. The browser does the cryptography: @solana/zk-sdk compiled to WebAssembly, with key derivation from one wallet signature via @softseco/confidential-transfers; recipient-side statement verification decrypts the recipient handle of the on-chain proof directly. Chain access through @solana/kit and @solana-program/token-2022, wallet-standard for any wallet, Sign-in with Solana for sessions. App: Next.js 16 on React 19, Tailwind, Drizzle with libsql on Turso, deployed on Vercel. Testing with Vitest. AI tools: I built Payslip with Claude Code as a pair programmer across design, implementation and devnet verification; every transaction in the demo was run and checked by hand on devnet.

**Important context about the repo**
One repository holds the whole product: the Next.js app, the Anchor vault program under `program/`, the CLI scripts, docs, brand kit and build log. First commit 3 October 2026; the only earlier work was research notes with no code. Third-party: `@softseco/confidential-transfers`, `@solana/zk-sdk`, `@solana-program/zk-elgamal-proof`, `@solana/kit`. The single-transaction V1 settlement, the vault program, recipient-side proof decryption and the product are original. The dev wallet in `src/lib/solana/devWallet.ts` is devnet-only test tooling with generated accounts; no private keys are committed. Known gaps are stated in the README: devnet, no independent audit yet, vault not yet on mainnet.

## Accelerator answers (private to organizers)

**How do you know people need this? (≤1000)**
Because I have watched it happen. A friend got paid for a bounty, posted the link, and within an hour someone on the same team had worked out what everyone else got. Nobody did anything wrong. The chain did exactly what it does. That is the quiet humiliation of being paid in USDC today: your rate is public, your raise is public, the grant you fought for is public, forever, to people who never earned the right to know. Teams accept it because the alternative, going back to bank wires, is worse. Solana fixed this in June with confidential balances, and almost nobody touched it; I counted four transactions in four days. Wallets had not integrated it and nobody owned the payer side. Payroll owns both ends of a transfer, so it does not have to wait for anyone. I will know people need it the day a program runs its real November payouts through it, and [X] operators have agreed to look at exactly that.

**How far along are you? (≤1000)**
Far enough that it is embarrassing to call it a demo. Since 3 October Payslip has run end to end on devnet, live at payslip-sol.vercel.app, every transaction real and linkable. A payer sets up a workspace, funds a vault that wraps USDC one to one with no admin, adds people by invite, CSV or a public link, and presses send. Each payout lands in a single transaction with three zero-knowledge proofs inside, about one second. I believe nobody has settled a confidential transfer that way before; the standard path takes five transactions. The recipient sees "Pay arrived" within seconds and can prove their own number from the chain. The auditor reads every number and spends nothing. What I do not have yet is a paying customer, and I am not going to pretend otherwise. I have a mainnet path rehearsed and [X] pilot conversations open. The next thirty days are about turning one of them into a real batch.

**Who else is building here, and what are they getting wrong? (≤1000)**
Everyone is solving half the problem and calling it done. Stablecoin payroll platforms are excellent at compliance and off-ramps, and every amount they send is public; privacy is not on their roadmap because their rails cannot do it. The privacy chains and shielded pools hide everything, which sounds perfect until you are the treasurer who has to show an accountant the books; they built privacy for individuals and forgot the organization. The Solana privacy teams are chasing traders and MEV, where the money shouts, and left the quiet human cases, salaries, grants, bounties, completely empty. The mistake they share is treating privacy as all or nothing. Payslip hides one number from one audience. The recipient reads it, the auditor reads it, the public cannot. That is the version a real finance lead can sign off on, and it is the version nobody else is building.

**How do you make money? (≤500)**
A flat fee per recipient per batch, paid in USDC at send time. Never a cut of anyone's pay; I find percentage fees on people's wages distasteful and so do the people being paid. A forty-person team paying monthly at two dollars a head is eighty dollars a month. A grant program paying three hundred people a quarter is six hundred dollars. Free on devnet and for the first pilots. Later, an accountant seat, and an SDK licence for payroll and bounty platforms that want private payouts without building the cryptography.

**How long, and full time? (≤500)**
Just me. I spent the back half of September reading everything about what Solana had quietly shipped and unused, and chose this. I built Payslip from 3 October to the deadline, full time, most days until the devnet RPC rate-limited me to bed. [What you did before this, and whether you go full time after.]

**Where is the team based? (≤500)**
[City, country], solo and remote. With funding I hire one engineer and one person who has sold to DAO treasurers before, remote first, and we do the accelerator's two weeks in San Francisco in person. I am not relocating the company for its own sake; the customers are everywhere USDC is.

Legal entity: No. Investment: No. Fundraising: Yes. Live token: No, and there will not be one.

## Pitch video (up to 2 minutes; introduce yourself, what you are building, why you)

Face to camera, one take. 1:50.

0:00 "Hi, I'm Success Aje, [where you are]. I'm building Payslip."

0:06 What it is. "Payslip is private payouts on Solana. A team, a DAO or a grant program pays people in USDC in one batch, and the amounts never show up on the public ledger. The person you paid can read their own number. The auditor you chose can read every number and can't move a cent. Everyone else sees a payment with no amount on it."

0:30 Why it matters. "Teams already pay in USDC because it's instant and global. The cost is that every salary, every grant, every bounty is public forever. I watched a friend's bounty get compared against a teammate's within an hour of the link going up. Nobody meant harm. The chain just does that, and no payroll app can fix it, because the leak is the chain."

0:55 Why now. "Solana shipped confidential balances in June and almost nobody used them; I counted four transactions in four days, because wallets never integrated it. Payroll owns both ends of a transfer, so it doesn't need the wallets. In September Transaction V1 made a private transfer fit in one transaction instead of five. Payslip is the first product I know of that does that."

1:20 Why me. "[Two honest sentences: what you have shipped before, and the thing that makes this problem yours.] I built the whole thing inside the hackathon window, by myself, and every transaction in the demo is real."

1:40 Close. "The pitch is one sentence: the only payout tool where the amounts are not public. Next is a first mainnet pilot with a grant program. Thanks."

## Demo video (up to 3 minutes; the live product, no slides, no code)

Screen recording of https://payslip-sol.vercel.app in a fresh browser window so the dev wallet starts empty. 2:50.

0:00 Landing. Click the demo panel: Anyone, Ada, Auditor. "Three views of the same batch. Ada sees her number, the auditor sees every number, the public sees dots."
0:20 Open app, connect the dev wallet, sign in. Account menu, Get devnet test funds. "A little SOL and test USDC so you can follow along."
0:40 Setup: name the workspace, keep Me for now as auditor, Create payout token. "One transaction creates a Token-2022 mint with the confidential extension and the auditor key baked in. The vault that backs it with USDC has no admin."
1:05 People: Add person, copy the invite link. Switch to the second dev account, open the link, register. Switch back. "One signature, one transaction."
1:35 Treasury: Wrap, Move to private. "USDC in, payout token out, one to one."
1:55 Payouts: New batch, Send payouts. "Each payout is one transaction with three zero-knowledge proofs inside." What the explorer sees. The receipt. "No amount anywhere."
2:25 Recipient: Pay arrived, Confirm receipt, balance. Statements, Verify: Verified on-chain.
2:40 Audit: Decrypt all transfers. "Books match the chain." End there.

## Checklist for submission day

- [ ] Repo public, README renders the GIF, build log current
- [ ] Both videos uploaded (YouTube unlisted or Loom), links tested logged out
- [ ] Logo uploaded (`brand/logo/logo-square-1024.png`)
- [ ] Every **[you]** above replaced
- [ ] Mainnet signature added if the minimal run was done
- [x] Live URL: https://payslip-sol.vercel.app
- [ ] Submit before 12 Oct 23:59 PT, then post the weekly update video
