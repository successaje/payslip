import Link from "next/link";
import { ArrowRight, Building2, Eye, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui";
import { Mark } from "@/components/brand/Wordmark";
import { Reveal } from "./Reveal";
import { DemoPanel } from "./DemoPanel";

const container = "mx-auto w-full max-w-[1120px] px-4 md:px-6";

export function Hero() {
  return (
    <section className={`${container} grid items-center gap-10 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-14`}>
      <div>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">Private payouts on Solana</p>
        <h1 className="mt-4 font-serif text-[44px] leading-[1.02] text-ink text-balance md:text-[62px]">
          Pay your people in USDC. Keep the amounts off the public ledger.
        </h1>
        <p className="mt-6 max-w-[48ch] text-[17px] text-ink-2 text-pretty">
          Salaries, contractor invoices, grants, bounties. Send them all in one batch. Each transfer is on-chain, each
          amount is encrypted. The recipient sees their own number. Your auditor sees every number. Everyone else sees
          a payment with no amount.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app">
            <Button size="lg" trailingIcon={<ArrowRight size={16} />}>
              Send private payouts
            </Button>
          </Link>
          <a href="#how">
            <Button size="lg" variant="secondary">
              See how it works
            </Button>
          </a>
        </div>
        <p className="mt-5 text-[13px] text-ink-3">Open source · Token-2022 confidential balances · Devnet today</p>
      </div>
      <Reveal delay={0.1}>
        <DemoPanel />
      </Reveal>
    </section>
  );
}

export function Problem() {
  const facts = [
    {
      title: "Every payout is public",
      body: "Pay a team, a contractor or a grantee from one wallet and anyone can read what each person got, forever. Deel can't fix that. Neither can any wallet.",
    },
    {
      title: "People look",
      body: "The junior finds the senior's number. A grantee sees what the other grantees got. A contractor's next client sees their last rate.",
    },
    {
      title: "So do competitors",
      body: "Your total headcount cost and who you pay most are one explorer search away. Bounty boards and DAOs publish every amount today because there has been no alternative.",
    },
  ];
  return (
    <section className="border-y border-line bg-paper-sunken/50">
      <div className={`${container} py-16 md:py-20`}>
        <Reveal>
          <h2 className="max-w-[26ch] font-serif text-[32px] leading-[1.1] text-ink text-balance md:text-[40px]">
            Teams already pay people in USDC. They just have not noticed who is watching.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {facts.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="border-l-2 border-ink pl-4">
                <h3 className="text-[16px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-[14.5px] text-ink-2 text-pretty">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Create your payout token",
      body: "One transaction creates a Token-2022 mint with the confidential extension and your auditor's key baked in. Backed 1:1 by USDC in a vault with no admin.",
    },
    {
      n: "02",
      title: "Invite recipients",
      body: "Employees, contractors, grantees, bounty winners. Each opens a link, connects a wallet, and registers a private account with one signature and one transaction.",
    },
    {
      n: "03",
      title: "Send the batch",
      body: "Press one button. Proofs are generated in your browser. Every transfer lands with its amount encrypted. If one fails, resume without paying anyone twice.",
    },
    {
      n: "04",
      title: "Everyone sees what they should",
      body: "Recipients decrypt their own amount. The auditor verifies every amount from chain. The public sees transfers with no numbers.",
    },
  ];
  return (
    <section id="how" className={`${container} py-16 md:py-24`}>
      <Reveal>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">How it works</p>
        <h2 className="mt-3 max-w-[22ch] font-serif text-[32px] leading-[1.1] text-ink text-balance md:text-[40px]">
          Four steps. Two wallet prompts for the recipient. One button for you.
        </h2>
      </Reveal>
      <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.05}>
            <li className="flex gap-4">
              <span className="font-mono text-[13px] text-ink-3 tnum">{s.n}</span>
              <div>
                <h3 className="text-[16px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 max-w-[46ch] text-[14.5px] text-ink-2 text-pretty">{s.body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

export function Roles() {
  const roles = [
    {
      icon: <Building2 size={18} />,
      title: "Teams, DAOs and grant programs",
      lines: [
        "Monthly salaries, contractor invoices, grant tranches, bounty prizes: one roster, one batch.",
        "A treasury you can read, nobody else can.",
        "Resume a batch after any failure without double paying.",
      ],
    },
    {
      icon: <Users size={18} />,
      title: "Recipients",
      lines: [
        "See your payout the moment it lands.",
        "Withdraw to a normal balance or convert back to USDC whenever you like.",
        "Nothing about your number ever leaves your device.",
      ],
    },
    {
      icon: <ShieldCheck size={18} />,
      title: "Auditors",
      lines: [
        "Decrypt every transfer straight from chain.",
        "Compare against the books, flag mismatches, export CSV.",
        "A read-only key. You cannot move a cent.",
      ],
    },
  ];
  return (
    <section id="roles" className="border-y border-line bg-paper-sunken/50">
      <div className={`${container} py-16 md:py-20`}>
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.06}>
              <div className="h-full rounded-[var(--radius-lg)] border border-line bg-paper-raised p-5">
                <div className="flex items-center gap-2 text-ink">
                  <span className="text-ink-3">{r.icon}</span>
                  <h3 className="text-[16px] font-semibold">{r.title}</h3>
                </div>
                <ul className="mt-3 space-y-1.5 text-[14px] text-ink-2">
                  {r.lines.map((l) => (
                    <li key={l} className="flex gap-2">
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-4" />
                      <span className="text-pretty">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BuiltOn() {
  const items = [
    {
      title: "Token-2022 confidential balances",
      body: "Encrypted balances and transfers at the token-program level. Re-enabled on mainnet in June 2026 after a year of audits, and barely used since. Payslip is a first real user.",
    },
    {
      title: "Auditor key",
      body: "An ElGamal public key set on the mint at creation. Whoever holds the matching wallet can decrypt amounts and nothing else. No side channel, no trusted server.",
    },
    {
      title: "Proofs in the browser",
      body: "Range and validity proofs run in WASM on the sender's machine. The server never sees a key, a secret, or a decrypted amount.",
    },
    {
      title: "USDC vault, no admin",
      body: "A small program wraps USDC into the payout token and back. Supply equals vault balance, always. No one can mint or withdraw outside those two instructions.",
    },
  ];
  return (
    <section id="solana" className={`${container} py-16 md:py-24`}>
      <Reveal>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">Built on Solana</p>
        <h2 className="mt-3 max-w-[24ch] font-serif text-[32px] leading-[1.1] text-ink text-balance md:text-[40px]">
          Privacy that comes from the chain, not from the app.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 0.05}>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">{it.title}</h3>
              <p className="mt-1.5 max-w-[48ch] text-[14.5px] text-ink-2 text-pretty">{it.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section className="border-t border-line">
      <div className={`${container} flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between md:py-20`}>
        <div>
          <h2 className="font-serif text-[32px] leading-[1.1] text-ink text-balance md:text-[40px]">Fourteen payouts. No amounts.</h2>
          <p className="mt-3 max-w-[44ch] text-[15px] text-ink-2 text-pretty">
            Set up a workspace, invite someone, and send a private payout on devnet in under five minutes.
          </p>
        </div>
        <Link href="/app">
          <Button size="lg" trailingIcon={<ArrowRight size={16} />}>
            Open Payslip
          </Button>
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${container} flex flex-col gap-4 py-8 text-[13px] text-ink-3 md:flex-row md:items-center md:justify-between`}>
        <div className="flex items-center gap-2">
          <Mark size={18} />
          <span>Payslip · Built for Colosseum&apos;s Crypto World&apos;s Fair, 2026</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="https://github.com/successaje/payslip" target="_blank" rel="noreferrer" className="hover:text-ink">
            GitHub
          </a>
          <a href="#how" className="hover:text-ink">
            How it works
          </a>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> Not audited. Devnet only for now.
          </span>
        </div>
      </div>
    </footer>
  );
}
