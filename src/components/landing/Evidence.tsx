import { ExternalLink } from "lucide-react";
import { proofPoints } from "@/lib/site/stats";
import { Reveal } from "./Reveal";

export function Evidence() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6 md:py-24">
      <Reveal>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">Why now</p>
        <h2 className="mt-3 max-w-[24ch] font-serif text-[32px] leading-[1.1] text-ink text-balance md:text-[40px]">
          The money already moves on-chain. The amounts never had to be public.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {proofPoints.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.06}>
            <div className="flex h-full flex-col rounded-[var(--radius-lg)] border border-line bg-paper-raised p-5">
              <h3 className="text-[16px] font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-[14.5px] text-ink-2 text-pretty">{p.body}</p>
              <a
                href={p.source.href}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex items-center gap-1 pt-4 text-[12.5px] text-ink-3 hover:text-ink"
              >
                {p.source.name} <ExternalLink size={11} />
              </a>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
