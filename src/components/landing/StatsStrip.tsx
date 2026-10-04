"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { stats, type Stat } from "@/lib/site/stats";
import { Reveal } from "./Reveal";

function CountUp({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? stat.value : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(stat.value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, stat.value]);

  const text = `${stat.prefix ?? ""}${n.toFixed(stat.decimals ?? 0)}${stat.suffix ?? ""}`;
  return (
    <span ref={ref} className="font-mono text-[40px] leading-none tracking-tight text-ink tnum md:text-[48px]">
      {text}
    </span>
  );
}

export function StatsStrip() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto grid w-full max-w-[1120px] gap-x-8 gap-y-10 px-4 py-14 md:grid-cols-2 md:px-6 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06}>
            <div className="flex h-full flex-col">
              <CountUp stat={s} />
              <p className="mt-3 text-[14px] font-medium text-ink">{s.label}</p>
              <p className="mt-1 text-[13px] text-ink-3 text-pretty">{s.detail}</p>
              <a
                href={s.source.href}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex items-center gap-1 pt-3 text-[12px] text-ink-4 hover:text-ink-2"
              >
                {s.source.name} <ExternalLink size={10} />
              </a>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
