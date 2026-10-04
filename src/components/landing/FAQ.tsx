"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";

const items: { q: string; a: string }[] = [
  {
    q: "What exactly is hidden?",
    a: "The amount of every transfer and every balance on the payout token. The explorer still shows that a transfer happened between two accounts and when. Payslip does not hide who you pay, only how much.",
  },
  {
    q: "Who can see the amounts?",
    a: "The recipient, for their own transfers and balance. The auditor you chose at setup, for every transfer on your payout token. Nobody else, including Payslip. Keys are derived from wallets with one signature and never leave the browser.",
  },
  {
    q: "Is the payout token real money?",
    a: "It is USDC wrapped 1:1 by a small on-chain program with no admin. Every unit of payout token corresponds to one USDC in the vault, and anyone can unwrap at any time. Supply equals vault balance, always, and you can verify it on-chain.",
  },
  {
    q: "What does the recipient have to do?",
    a: "Open an invite link, connect a wallet, sign once to derive their keys, and send one transaction to register a private account. From then on they confirm receipt with one signature when pay lands and can withdraw or convert to USDC whenever they like.",
  },
  {
    q: "Can the auditor move funds?",
    a: "No. The auditor key is an ElGamal public key set on the mint at creation. It can decrypt amounts and nothing else. It cannot spend, freeze, or move anything.",
  },
  {
    q: "What if a batch fails halfway?",
    a: "Each payment is its own set of transactions and its state is saved after every stage. Paid people stay paid; failed or interrupted payments are retried with one click. Nobody is paid twice.",
  },
  {
    q: "Which wallets work?",
    a: "Any wallet that supports the Solana wallet standard, such as Phantom or Solflare. On devnet there is also a built-in developer wallet so you can try both sides of a payout in one browser.",
  },
  {
    q: "Is this production ready?",
    a: "Not yet. It runs end to end on devnet and the code is open source. The vault program and the app have not been independently audited. Mainnet with real amounts is the next milestone.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-line bg-paper-sunken/50">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 py-16 md:grid-cols-[1fr_1.6fr] md:px-6 md:py-24">
        <Reveal>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">Questions</p>
          <h2 className="mt-3 font-serif text-[32px] leading-[1.1] text-ink text-balance md:text-[40px]">
            Straight answers about what is private and what is not.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-paper-raised">
            {items.map((it, i) => {
              const isOpen = open === i;
              return (
                <li key={it.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[15px] font-medium text-ink">{it.q}</span>
                    <Plus size={16} className={cn("shrink-0 text-ink-3 transition-transform duration-200", isOpen && "rotate-45")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-[14.5px] text-ink-2 text-pretty">{it.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
