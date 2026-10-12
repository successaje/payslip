"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/cn";

/**
 * Kinetic-type backdrop for the pitch video, timed to the script in
 * docs/SUBMISSION.md. Open /pitch at 1920x1080, press space to start, record
 * the screen and talk over it. Arrow keys step scenes; R restarts; H hides
 * the timecode for the final take. Each scene lands as the matching line of
 * the script is spoken, with a little slack.
 */
type Scene = { at: number; id: string };
const SCENES: Scene[] = [
  { at: 0, id: "title" },
  { at: 6, id: "what" },
  { at: 30, id: "problem" },
  { at: 55, id: "now" },
  { at: 80, id: "me" },
  { at: 100, id: "close" },
];
const END = 112;

const ease = [0.16, 1, 0.3, 1] as const;
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 24, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, delay, ease } },
  exit: { opacity: 0, y: -16, filter: "blur(6px)", transition: { duration: 0.5, ease } },
});

export function PitchPlayer() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const startedAt = useRef<number | null>(null);
  const offset = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const next = offset.current + (now - startedAt.current) / 1000;
      setT(Math.min(next, END));
      if (next < END) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      offset.current = t;
      startedAt.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = SCENES.findIndex((s, i) => t >= s.at && (SCENES[i + 1] === undefined || t < SCENES[i + 1].at));
      const jump = (to: number) => {
        offset.current = to;
        startedAt.current = null;
        setT(to);
      };
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") jump(SCENES[Math.min(idx + 1, SCENES.length - 1)].at);
      else if (e.key === "ArrowLeft") jump(SCENES[Math.max(idx - 1, 0)].at);
      else if (e.key.toLowerCase() === "r") {
        jump(0);
        setPlaying(false);
      } else if (e.key.toLowerCase() === "h") setShowHud((h) => !h);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t]);

  const scene = SCENES.reduce((acc, s) => (t >= s.at ? s.id : acc), "title");
  const mm = Math.floor(t / 60);
  const ss = Math.floor(t % 60).toString().padStart(2, "0");

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f7f6f2] text-[#171614]" style={{ fontFamily: "var(--font-sans)" }}>
      <Grain />
      <div className="absolute inset-0 flex items-center justify-center px-[8vw]">
        <AnimatePresence mode="wait">
          {scene === "title" && <Title key="title" playing={playing} />}
          {scene === "what" && <What key="what" reduced={!!reduced} />}
          {scene === "problem" && <Problem key="problem" />}
          {scene === "now" && <Now key="now" />}
          {scene === "me" && <Me key="me" />}
          {scene === "close" && <Close key="close" />}
        </AnimatePresence>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[#e2dfd7]">
        <motion.div className="h-full bg-[#0f6b4f]" animate={{ width: `${(t / END) * 100}%` }} transition={{ duration: 0.2, ease: "linear" }} />
      </div>
      {showHud && (
        <div className="absolute left-[3vw] top-[3vh] flex items-center gap-3 font-mono text-[13px] text-[#85817a]">
          <span className={cn("inline-block h-2 w-2 rounded-full", playing ? "bg-[#0f6b4f]" : "bg-[#b6b2aa]")} />
          {mm}:{ss} · {scene} · space play/pause · ←→ scenes · R restart · H hide this
        </div>
      )}
    </div>
  );
}

function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply"
      style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")" }}
    />
  );
}

const serif = { fontFamily: "var(--font-serif)" } as const;

function Title({ playing }: { playing: boolean }) {
  return (
    <motion.div {...rise()} className="flex flex-col items-center text-center">
      <div className="flex items-center gap-[1.2vw]">
        <Mark size={96} />
        <span className="text-[6vw] font-semibold tracking-[-0.03em]">Payslip</span>
      </div>
      <motion.p {...rise(0.6)} className="mt-[2vh] text-[1.6vw] text-[#4d4a44]" style={serif}>
        Private payouts on Solana
      </motion.p>
      {!playing && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.4 } }} className="mt-[6vh] font-mono text-[0.9vw] text-[#b6b2aa]">
          press space
        </motion.p>
      )}
    </motion.div>
  );
}

function What({ reduced }: { reduced: boolean }) {
  const rows = [
    { who: "The person you paid", sees: "$2,350.00", tone: "#171614" },
    { who: "Your auditor", sees: "every number", tone: "#0f6b4f" },
    { who: "Everyone else", sees: "••••••", tone: "#b6b2aa" },
  ];
  return (
    <motion.div {...rise()} className="w-full max-w-[70vw]">
      <h1 className="text-[4.6vw] leading-[1.02] tracking-[-0.02em]" style={serif}>
        Pay your people in USDC.
        <br />
        Keep the amounts off the public ledger.
      </h1>
      <div className="mt-[6vh] grid gap-[1.6vh]">
        {rows.map((r, i) => (
          <motion.div
            key={r.who}
            initial={{ opacity: 0, x: reduced ? 0 : -20 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 6 + i * 4.5, duration: 0.8, ease } }}
            className="flex items-baseline justify-between border-b border-[#e2dfd7] pb-[1.4vh] text-[2vw]"
          >
            <span className="text-[#4d4a44]">{r.who}</span>
            <span className="font-mono text-[2.4vw]" style={{ color: r.tone }}>
              {r.sees}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Problem() {
  const amounts = ["$2,350", "$4,100", "$1,800", "$3,900", "$750", "$12,000", "$2,350", "$980"];
  return (
    <motion.div {...rise()} className="w-full max-w-[72vw]">
      <h1 className="text-[4.4vw] leading-[1.02] tracking-[-0.02em]" style={serif}>
        Every USDC payout is public.
        <br />
        <span className="text-[#85817a]">Forever.</span>
      </h1>
      <div className="mt-[5vh] flex flex-wrap gap-[1.2vw]">
        {amounts.map((a, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 1, 0.35], scale: 1, transition: { delay: 1 + i * 0.5, duration: 2.4, times: [0, 0.2, 0.7, 1] } }}
            className="rounded-[10px] border border-[#e2dfd7] bg-white px-[1.2vw] py-[1vh] font-mono text-[1.8vw]"
          >
            {a}
          </motion.span>
        ))}
      </div>
      <motion.p {...rise(8)} className="mt-[5vh] max-w-[52vw] text-[1.7vw] text-[#4d4a44]">
        Your rate, your raise, the grant you fought for. Readable by anyone who never earned the right to know. No payroll app can fix it. The leak is the chain.
      </motion.p>
    </motion.div>
  );
}

function Now() {
  return (
    <motion.div {...rise()} className="w-full max-w-[72vw]">
      <div className="grid grid-cols-2 gap-[4vw]">
        <div>
          <p className="font-mono text-[1vw] uppercase tracking-[0.12em] text-[#85817a]">June 2026</p>
          <h2 className="mt-[1.5vh] text-[3.2vw] leading-[1.05] tracking-[-0.02em]" style={serif}>
            Confidential balances went live.
          </h2>
          <motion.p {...rise(3)} className="mt-[2vh] text-[1.5vw] text-[#4d4a44]">
            Four transactions in four days. Wallets never integrated it.
          </motion.p>
        </div>
        <div>
          <p className="font-mono text-[1vw] uppercase tracking-[0.12em] text-[#85817a]">September 2026</p>
          <h2 className="mt-[1.5vh] text-[3.2vw] leading-[1.05] tracking-[-0.02em]" style={serif}>
            One transaction, not five.
          </h2>
          <motion.div {...rise(9)} className="mt-[2vh] flex items-center gap-[1vw] font-mono text-[2.6vw]">
            <span className="text-[#b6b2aa] line-through">5</span>
            <span className="text-[#85817a]">→</span>
            <span className="text-[#0f6b4f]">1</span>
            <span className="text-[1.2vw] text-[#85817a]">three proofs + transfer, about a second</span>
          </motion.div>
        </div>
      </div>
      <motion.p {...rise(14)} className="mt-[7vh] text-[2.2vw] leading-[1.2] tracking-[-0.01em]" style={serif}>
        Payroll owns both ends of a transfer. It does not need the wallets.
      </motion.p>
    </motion.div>
  );
}

function Me() {
  return (
    <motion.div {...rise()} className="w-full max-w-[64vw] text-center">
      <p className="font-mono text-[1vw] uppercase tracking-[0.12em] text-[#85817a]">Built by</p>
      <h2 className="mt-[1.5vh] text-[4.2vw] tracking-[-0.02em]" style={serif}>
        Success Aje
      </h2>
      <p className="mt-[0.4vh] font-mono text-[1.1vw] uppercase tracking-[0.12em] text-[#85817a]">Lagos, Nigeria</p>
      <motion.p {...rise(0.6)} className="mt-[1vh] text-[1.6vw] text-[#4d4a44]">
        Solo. Built inside the hackathon window. Every transaction in the demo is real.
      </motion.p>
      <motion.div {...rise(6)} className="mx-auto mt-[6vh] grid max-w-[46vw] grid-cols-3 gap-[2vw] text-[1.2vw] text-[#4d4a44]">
        {[["3 Oct", "first commit"], ["33", "pull requests"], ["1", "transaction per payout"]].map(([n, l]) => (
          <div key={l} className="rounded-[12px] border border-[#e2dfd7] bg-white p-[1.4vw]">
            <div className="font-mono text-[2.4vw] text-[#171614]">{n}</div>
            <div className="mt-[0.4vh]">{l}</div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function Close() {
  return (
    <motion.div {...rise()} className="w-full max-w-[72vw] text-center">
      <h1 className="text-[5vw] leading-[1.02] tracking-[-0.025em]" style={serif}>
        The only payout tool where
        <br />
        the amounts are not public.
      </h1>
      <motion.div {...rise(2)} className="mt-[6vh] flex items-center justify-center gap-[1vw]">
        <Mark size={44} />
        <span className="font-mono text-[1.6vw] text-[#4d4a44]">payslip-sol.vercel.app</span>
      </motion.div>
    </motion.div>
  );
}
