import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What shipped, in order.",
};

const entries: { date: string; title: string; body: string; href?: string }[] = [
  {
    date: "2026-10-04",
    title: "Repositioned around private payouts",
    body: "Salaries, invoices, grants and bounties in one batch. Landing, app copy and docs rewritten; demo GIF recorded on devnet.",
    href: "https://github.com/successaje/payslip/pull/13",
  },
  {
    date: "2026-10-03",
    title: "Vault program live on devnet",
    body: "payslip_vault deployed. Setup creates the payout token with the vault PDA as mint authority; wrap, pay, withdraw and unwrap verified end to end. Supply equals vault balance.",
    href: "https://github.com/successaje/payslip/pull/11",
  },
  {
    date: "2026-10-03",
    title: "Landing page, settings and error screens",
    body: "Three-perspective demo panel, settings with on-chain facts, loading and error states, 404.",
    href: "https://github.com/successaje/payslip/pull/8",
  },
  {
    date: "2026-10-03",
    title: "Auditor view",
    body: "Auditor derives the key with one signature and decrypts every transfer from chain, compares with the books, exports CSV.",
    href: "https://github.com/successaje/payslip/pull/7",
  },
  {
    date: "2026-10-03",
    title: "Payout batches from the browser",
    body: "Roster snapshot, per-person staged progress, resume after failure, explorer-view toggle, treasury check, recipient home with decrypt and withdraw.",
    href: "https://github.com/successaje/payslip/pull/6",
  },
  {
    date: "2026-10-03",
    title: "People and invites",
    body: "Roster, invite links, recipient onboarding that registers a confidential account in one signature and one transaction.",
    href: "https://github.com/successaje/payslip/pull/5",
  },
  {
    date: "2026-10-03",
    title: "Workspace setup",
    body: "Token-2022 mint with the confidential extension and an auditor key, created from the browser with WASM proof libraries.",
    href: "https://github.com/successaje/payslip/pull/4",
  },
  {
    date: "2026-10-03",
    title: "Wallet and sign-in",
    body: "Wallet-standard connection, sign-in with Solana sessions, design system, repository foundation.",
    href: "https://github.com/successaje/payslip/pull/3",
  },
];

export default function ChangelogPage() {
  return (
    <SitePage eyebrow="Changelog" title="What shipped, in order." intro="Every entry links to the pull request that landed it.">
      <ol className="not-prose relative border-l border-line pl-6">
        {entries.map((e) => (
          <li key={e.title} className="relative pb-8 last:pb-0">
            <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-ink" />
            <p className="font-mono text-[12px] text-ink-3 tnum">{e.date}</p>
            <h2 className="mt-1 text-[17px] font-semibold text-ink">{e.title}</h2>
            <p className="mt-1 text-[14.5px] text-ink-2 text-pretty">{e.body}</p>
            {e.href && (
              <a href={e.href} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[13px] text-ink-3 underline underline-offset-2 hover:text-ink">
                Pull request
              </a>
            )}
          </li>
        ))}
      </ol>
    </SitePage>
  );
}
