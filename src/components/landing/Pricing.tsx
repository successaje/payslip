import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Reveal } from "./Reveal";

const tiers = [
  {
    name: "Devnet",
    price: "Free",
    note: "Now",
    lines: ["Unlimited recipients and batches", "Built-in developer wallet", "Every feature, test funds only"],
    cta: { label: "Try it", href: "/app" },
    primary: true,
  },
  {
    name: "Mainnet",
    price: "$2",
    unit: "per recipient per batch",
    note: "After audit",
    lines: ["Real USDC through the vault", "Auditor access and CSV export", "Email support, no custody, ever"],
    cta: { label: "Read the security plan", href: "/security" },
  },
  {
    name: "Programs",
    price: "Talk to us",
    note: "DAOs and grant programs",
    lines: ["Public 'pay a bounty privately' links", "Multiple auditors", "Dedicated onboarding"],
    cta: { label: "See what is shipping", href: "/changelog" },
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6 md:py-24">
      <Reveal>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">Pricing</p>
        <h2 className="mt-3 max-w-[24ch] font-serif text-[32px] leading-[1.1] text-ink text-balance md:text-[40px]">
          Free on devnet. A flat fee per payout on mainnet. Never a cut of your money.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {tiers.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.06}>
            <div className={`flex h-full flex-col rounded-[var(--radius-lg)] border p-5 ${t.primary ? "border-ink bg-paper-raised" : "border-line bg-paper-raised"}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-[15px] font-semibold text-ink">{t.name}</h3>
                <span className="text-[12px] text-ink-3">{t.note}</span>
              </div>
              <p className="mt-4 font-mono text-[32px] leading-none text-ink tnum">{t.price}</p>
              {t.unit && <p className="mt-1 text-[12.5px] text-ink-3">{t.unit}</p>}
              <ul className="mt-5 space-y-2 text-[14px] text-ink-2">
                {t.lines.map((l) => (
                  <li key={l} className="flex gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-green" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <ButtonLink href={t.cta.href} variant={t.primary ? "primary" : "secondary"} block trailingIcon={<ArrowRight size={15} />}>
                  {t.cta.label}
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-ink-3">Mainnet pricing is a plan, not a promise, until the audit is done.</p>
    </section>
  );
}
