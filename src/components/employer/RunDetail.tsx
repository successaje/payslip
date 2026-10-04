"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { address as toAddress } from "@solana/kit";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, ExternalLink, Eye, EyeOff, Play, RotateCcw, Square } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Amount, Badge, Button, Card, CardBody, PageHeader, Skeleton, Spinner, useToast, type Tone } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { api } from "@/lib/api/client";
import type { PaymentStatus } from "@/lib/db/schema";
import { paymentsToAttempt } from "@/lib/domain/payroll";
import { runPayroll, type RunnerEvent, type RunnerPayment } from "@/lib/payroll/runner";
import { decryptAvailableBalance } from "@/lib/solana/confidential";
import { explorerUrl } from "@/lib/solana/config";
import { formatDateTime, shortAddress } from "@/lib/format";
import { cn } from "@/lib/cn";
import { runTone } from "./Payroll";

const paymentTone: Record<PaymentStatus, { tone: Tone; label: string }> = {
  pending: { tone: "neutral", label: "Waiting" },
  preparing: { tone: "blue", label: "Generating proofs" },
  signing: { tone: "blue", label: "Waiting for signature" },
  submitted: { tone: "blue", label: "Submitted" },
  confirming: { tone: "blue", label: "Confirming" },
  paid: { tone: "green", label: "Paid" },
  failed: { tone: "red", label: "Failed" },
};

type Row = RunnerPayment & { detail?: string };

const IN_FLIGHT_STATUSES: PaymentStatus[] = ["preparing", "signing", "submitted", "confirming"];

export function RunDetail({ runId }: { runId: string }) {
  const { company, client, signer } = useApp();
  const { toast } = useToast();
  const resource = useResource(() => api.getRun(company!.id, runId), [company?.id, runId]);
  const [live, setLive] = useState<Record<string, Partial<Row>>>({});
  const [running, setRunning] = useState(false);
  const [publicView, setPublicView] = useState(false);
  const [treasury, setTreasury] = useState<{ status: "idle" | "checking" | "ok" | "short" | "error"; available?: bigint; message?: string }>({ status: "idle" });
  const stopRef = useRef(false);

  // Payments the server still shows mid-flight while nothing is running here
  // were interrupted (tab closed, crash). Present them as retryable.
  const rows: Row[] = useMemo(
    () =>
      (resource.data?.payments ?? []).map((p) => {
        const merged = { ...p, ...live[p.id] };
        if (!running && !live[p.id] && IN_FLIGHT_STATUSES.includes(p.status)) {
          return { ...merged, status: "failed" as const, error: "Interrupted. Retry to pay." };
        }
        return merged;
      }),
    [resource.data, live, running],
  );
  const run = resource.data?.run;
  const paid = rows.filter((r) => r.status === "paid").length;
  const remaining = paymentsToAttempt(rows).length;
  const inFlight = rows.some((r) => IN_FLIGHT_STATUSES.includes(r.status));

  if (!company) return null;

  const onEvent = (e: RunnerEvent) =>
    setLive((l) => ({
      ...l,
      [e.paymentId]: {
        status: e.status,
        detail: e.detail,
        ...(e.signature ? { signature: e.signature } : {}),
        ...(e.error !== undefined ? { error: e.error } : {}),
      },
    }));

  const checkTreasury = async (total: bigint) => {
    setTreasury({ status: "checking" });
    try {
      const available = await decryptAvailableBalance(client, signer, toAddress(company.mint!));
      if (available < total) setTreasury({ status: "short", available });
      else setTreasury({ status: "ok", available });
      return available >= total;
    } catch (e) {
      setTreasury({ status: "error", message: e instanceof Error ? e.message : "Could not read treasury" });
      return false;
    }
  };

  const start = async () => {
    if (!run || !company.mint) return;
    const toPay = paymentsToAttempt(rows);
    const total = toPay.reduce((t, p) => t + BigInt(p.amount), 0n);
    setRunning(true);
    stopRef.current = false;
    try {
      const ok = await checkTreasury(total);
      if (!ok) return;
      const result = await runPayroll({
        companyId: company.id,
        runId,
        mint: toAddress(company.mint),
        auditorElgamalPubkey: company.auditorElgamalPubkey ? toAddress(company.auditorElgamalPubkey) : null,
        payments: rows,
        client,
        signer,
        onEvent,
        shouldStop: () => stopRef.current,
      });
      await resource.reload();
      setLive({});
      if (result.failed === 0 && !result.stopped) {
        toast({ tone: "success", title: "Batch complete", description: `${result.paid} ${result.paid === 1 ? "person" : "people"} paid. Amounts are not visible on-chain.` });
      } else if (result.stopped) {
        toast({ title: "Batch paused", description: `${result.paid} paid so far. Resume whenever you are ready.` });
      } else {
        toast({ tone: "warning", title: "Some payments failed", description: `${result.paid} paid, ${result.failed} failed. Retry the failed ones.` });
      }
    } finally {
      setRunning(false);
    }
  };

  if (resource.status === "error") {
    return (
      <>
        <BackLink />
        <p className="text-[15px] font-medium text-ink">Could not load this run</p>
        <p className="mt-1 text-[13.5px] text-ink-3">{resource.error}</p>
        <Button className="mt-4" variant="secondary" onClick={resource.reload}>
          Try again
        </Button>
      </>
    );
  }

  if (!run) {
    return (
      <>
        <BackLink />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-80" />
        <Skeleton className="mt-6 h-64 w-full" />
      </>
    );
  }

  const t = runTone[run.status];
  const done = run.status === "completed";

  return (
    <>
      <BackLink />
      <PageHeader
        title={run.period}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={t.tone} dot pulse={running}>
              {running ? "Paying…" : t.label}
            </Badge>
            <span>
              {paid} of {rows.length} paid
            </span>
            {run.completedAt && <span>· {formatDateTime(run.completedAt)}</span>}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={publicView ? <EyeOff size={15} /> : <Eye size={15} />}
              onClick={() => setPublicView((v) => !v)}
            >
              {publicView ? "Your view" : "What the explorer sees"}
            </Button>
            {running ? (
              <Button variant="danger" leadingIcon={<Square size={14} />} onClick={() => (stopRef.current = true)}>
                Stop after this one
              </Button>
            ) : remaining > 0 ? (
              <Button
                leadingIcon={paid > 0 ? <RotateCcw size={15} /> : <Play size={15} />}
                onClick={start}
                disabled={inFlight}
              >
                {paid > 0 ? `Pay remaining ${remaining}` : "Send payouts"}
              </Button>
            ) : null}
          </>
        }
      />

      <AnimatePresence>
        {treasury.status === "short" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 rounded-[var(--radius-md)] border border-amber/30 bg-amber-soft p-4"
          >
            <p className="text-[14px] font-medium text-amber">Treasury is short</p>
            <p className="mt-1 text-[13px] text-ink-2">
              Private balance available: <Amount value={treasury.available ?? 0n} size="sm" />. This batch needs{" "}
              <Amount value={paymentsToAttempt(rows).reduce((s, p) => s + BigInt(p.amount), 0n)} size="sm" />.
            </p>
            <Link href="/app/treasury" className="mt-2 inline-block text-[13px] font-medium text-ink underline underline-offset-2">
              Fund the treasury
            </Link>
          </motion.div>
        )}
        {treasury.status === "error" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4 rounded-[var(--radius-md)] border border-red/30 bg-red-soft p-4">
            <p className="text-[14px] font-medium text-red">Could not read your treasury</p>
            <p className="mt-1 text-[13px] text-ink-2">{treasury.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <div className="hidden grid-cols-[1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3 md:grid hairline">
          <span>Person</span>
          <span>Status</span>
          <span className="text-right">Amount</span>
          <span className="w-28 text-right">Transaction</span>
        </div>
        <ul>
          {rows.map((r) => {
            const pt = paymentTone[r.status];
            const active = IN_FLIGHT_STATUSES.includes(r.status);
            return (
              <li
                key={r.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 hairline last:shadow-none md:grid-cols-[1.5fr_1fr_1fr_auto]",
                  active && "bg-blue-soft/40",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{r.employee.name}</p>
                  <p className="truncate font-mono text-[12px] text-ink-3">{r.employee.walletAddress ? shortAddress(r.employee.walletAddress, 6) : "No wallet"}</p>
                </div>
                <div className="order-3 flex items-center gap-2 md:order-none">
                  {active ? <Spinner size={13} className="text-blue" /> : r.status === "paid" ? <Check size={14} className="text-green" /> : null}
                  <span className={cn("text-[13px]", r.status === "failed" ? "text-red" : r.status === "paid" ? "text-green-ink" : "text-ink-2")}>
                    {r.status === "failed" && r.error ? r.error : (r.detail ?? pt.label)}
                  </span>
                </div>
                <div className="text-right">
                  <Amount value={r.amount} hidden={publicView} />
                </div>
                <div className="order-4 text-right md:order-none md:w-28">
                  {r.signature ? (
                    <a
                      href={explorerUrl("tx", r.signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-2 underline decoration-line underline-offset-4 hover:text-ink"
                    >
                      {shortAddress(r.signature, 4)} <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-[12px] text-ink-4">—</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between px-5 py-3 text-[13px] text-ink-3">
          <span>{publicView ? "Amounts are encrypted on-chain. This is what anyone else sees." : "Batch total"}</span>
          <Amount value={run.total} hidden={publicView} className="text-ink-2" />
        </div>
      </Card>

      {done && (
        <Card className="mt-4">
          <CardBody className="pt-5">
            <p className="text-[14px] font-medium text-ink">Everyone is paid.</p>
            <p className="mt-1 text-[13.5px] text-ink-3 text-pretty">
              Each person can now see their own amount in Payslip. Your auditor can verify every transfer from the
              Audit page. The explorer shows the transfers and nothing else.
            </p>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function BackLink() {
  return (
    <Link href="/app/payroll" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
      <ArrowLeft size={14} /> All batches
    </Link>
  );
}
