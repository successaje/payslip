import type { ReactNode } from "react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Sections";

/** Shell for marketing-side pages other than the landing page. */
export function SitePage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[760px] px-4 py-14 md:px-6 md:py-20">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-[36px] leading-[1.08] text-ink text-balance md:text-[48px]">{title}</h1>
          {intro && <p className="mt-5 text-[17px] text-ink-2 text-pretty">{intro}</p>}
          <div className="prose-payslip mt-10">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
