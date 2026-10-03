import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Temporary landing until the marketing page lands. Kept minimal and honest:
 * it says what Payslip is and links to the app.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col justify-center px-4 py-20 md:px-6">
      <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">Payslip</p>
      <h1 className="mt-4 max-w-[18ch] font-serif text-[44px] leading-[1.05] text-ink text-balance md:text-[64px]">
        Payroll in USDC. Salaries nobody else can read.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[17px] text-ink-2 text-pretty">
        Pay your whole team on Solana in one batch. The transfer is on-chain, the amount is encrypted. Each person sees
        their own pay. Your auditor sees everything. The explorer sees nothing.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app">
          <Button size="lg" trailingIcon={<ArrowRight size={16} />}>
            Run private payroll
          </Button>
        </Link>
        <Link href="/#how">
          <Button size="lg" variant="secondary">
            See how it works
          </Button>
        </Link>
      </div>
    </main>
  );
}
