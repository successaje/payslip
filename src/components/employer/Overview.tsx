"use client";

import Link from "next/link";
import { address as toAddress } from "@solana/kit";
import { motion } from "motion/react";
import { ArrowRight, Check, Landmark, Receipt, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/components/app/AppContext";
import { Amount, Badge, Button, ButtonLink, Card, CardBody, CardHeader, PageHeader, Skeleton, SkeletonRows } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { api } from "@/lib/api/client";
import type { Employee, PayrollRun } from "@/lib/db/schema";
import { sum } from "@/lib/domain/money";
import { formatDate, shortAddress } from "@/lib/format";
import { readHolderState, type HolderState } from "@/lib/solana/accounts";
import { readVaultBalance } from "@/lib/solana/vault";
import { explorerUrl } from "@/lib/solana/config";
import { cn } from "@/lib/cn";
import { runTone } from "./Payroll";

interface Snapshot {
  people: Employee[];
  runs: PayrollRun[];
  treasury: HolderState;
  /** USDC held by the vault, i.e. what backs every payout token in circulation. */
  vault: bigint;
}

/**
 * The workspace home. Until the three things a first payout needs are in
 * place (people, a funded treasury, a sent batch) it is a checklist that
 * reads its state from the database and the chain. After that it is a
 * summary with the recent batches.
 */
export function Overview() {
  const { company, account, client } = useApp();
  const mint = company?.mint ?? null;

  const snapshot = useResource<Snapshot>(async () => {
    if (!company || !mint) throw new Error("Workspace not set up");
    const m = toAddress(mint);
    const [people, runs, treasury, vault] = await Promise.all([
      api.listEmployees(company.id),
      api.listRuns(company.id),
      readHolderState(client, toAddress(account.address), m),
      readVaultBalance(client, m),
    ]);
    return { people, runs, treasury, vault };
  }, [company?.id, mint, account.address, client]);

  if (!company) return null;
  if (!company.mint) {
    return (
      <>
        <PageHeader title={company.name} description="Private payouts on Solana. Amounts are encrypted on-chain." />
        <Card>
          <CardBody className="pt-5">
            <p className="text-[15px] font-semibold text-ink">Finish setting up</p>
            <p className="mt-1 text-[13.5px] text-ink-3 text-pretty">
              The workspace was saved but its payout token was not created yet. Pick up where you left off; nothing is lost.
            </p>
            <ButtonLink href="/app/setup" className="mt-4" trailingIcon={<ArrowRight size={15} />}>
              Continue setup
            </ButtonLink>
          </CardBody>
        </Card>
      </>
    );
  }

  const s = snapshot.data;
  const ready = s?.people.filter((p) => p.status === "active") ?? [];
  const invited = s?.people.filter((p) => p.status === "invited").length ?? 0;
  const requested = s?.people.filter((p) => p.status === "requested").length ?? 0;
  const batchTotal = sum(ready.map((p) => BigInt(p.amount)));
  const sent = s?.runs.filter((r) => r.status === "completed" || r.status === "partial") ?? [];
  const latest = s?.runs[0] ?? null;

  const steps: ChecklistStep[] = s
    ? [
        {
          key: "people",
          icon: <Users size={16} />,
          title: "Add people",
          done: ready.length > 0,
          detail:
            ready.length > 0
              ? `${ready.length} ready to be paid${invited ? `, ${invited} still setting up` : ""}${requested ? `, ${requested} waiting for approval` : ""}`
              : invited
                ? `${invited} invited, none have finished setup yet. They each need one signature and one transaction.`
                : "Invite people one by one, or turn on a public link for bounties and grants.",
          href: "/app/people",
          cta: ready.length > 0 ? "Manage people" : invited ? "See who is pending" : "Add your first person",
        },
        {
          key: "treasury",
          icon: <Landmark size={16} />,
          title: "Fund the treasury",
          done: s.treasury.configured && s.vault > 0n,
          detail: !s.treasury.configured
            ? "Prepare a private balance for the workspace, then wrap USDC into the payout token."
            : s.vault > 0n
              ? `The vault holds the USDC backing every payout token. Move funds to your private balance before a batch.`
              : "Private balance is ready. Wrap USDC into the payout token and move it private.",
          href: "/app/treasury",
          cta: s.treasury.configured && s.vault > 0n ? "Open treasury" : "Fund it",
        },
        {
          key: "batch",
          icon: <Receipt size={16} />,
          title: "Send a batch",
          done: sent.length > 0,
          detail:
            sent.length > 0
              ? `${sent.length} ${sent.length === 1 ? "batch" : "batches"} sent. Every amount settled encrypted on-chain.`
              : ready.length > 0
                ? `Pays ${ready.length} ${ready.length === 1 ? "person" : "people"} in one go. You watch each transfer confirm.`
                : "Available once at least one person is ready and the treasury is funded.",
          href: "/app/payroll",
          cta: sent.length > 0 ? "Open payouts" : "Send first batch",
        },
      ]
    : [];
  const doneCount = steps.filter((st) => st.done).length;
  const allDone = s !== null && doneCount === steps.length;

  return (
    <>
      <PageHeader
        title={company.name}
        description="Private payouts on Solana. Amounts are encrypted on-chain."
        actions={
          allDone ? (
            <ButtonLink href="/app/payroll" trailingIcon={<ArrowRight size={15} />}>
              New batch
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="People ready" loading={!s}>
          <span className="font-mono tnum text-[20px] text-ink">{ready.length}</span>
          {s && (invited > 0 || requested > 0) && (
            <span className="ml-2 text-[12.5px] text-ink-3">
              {[invited ? `${invited} invited` : null, requested ? `${requested} requested` : null].filter(Boolean).join(" · ")}
            </span>
          )}
        </Stat>
        <Stat label="Batch total" loading={!s}>
          <Amount value={batchTotal} size="lg" />
        </Stat>
        <Stat label="Vault backing" hint="USDC held 1:1 against the payout token" loading={!s}>
          <Amount value={s?.vault} size="lg" />
        </Stat>
        <Stat label="Last batch" loading={!s}>
          {latest ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge tone={runTone[latest.status].tone} dot>
                {runTone[latest.status].label}
              </Badge>
              <span className="whitespace-nowrap text-[12.5px] text-ink-3">{formatDate(latest.completedAt ?? latest.createdAt, { year: undefined })}</span>
            </div>
          ) : (
            <span className="text-[13.5px] text-ink-3">None yet</span>
          )}
        </Stat>
      </div>

      {snapshot.status === "error" ? (
        <Card className="mt-6">
          <CardBody className="pt-5">
            <p className="text-[14px] font-medium text-ink">Could not load the workspace</p>
            <p className="mt-1 text-[13.5px] text-ink-3">{snapshot.error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={snapshot.reload}>
              Try again
            </Button>
          </CardBody>
        </Card>
      ) : !s ? (
        <Card className="mt-6 px-5">
          <SkeletonRows rows={3} />
        </Card>
      ) : allDone ? (
        <RecentBatches runs={s.runs.slice(0, 4)} />
      ) : (
        <Card className="mt-6">
          <CardHeader
            title="Get set up"
            description="Three things stand between you and the first private payout."
            action={
              <span className="font-mono tnum text-[12.5px] text-ink-3">
                {doneCount} of {steps.length}
              </span>
            }
          />
          <div className="mx-5 h-1 overflow-hidden rounded-full bg-paper-inset">
            <motion.div
              className="h-full rounded-full bg-green"
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / steps.length) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <ol className="mt-2 divide-y divide-line">
            {steps.map((st, i) => (
              <ChecklistRow key={st.key} step={st} index={i} active={!st.done && steps.slice(0, i).every((p) => p.done)} />
            ))}
          </ol>
        </Card>
      )}

      {requested > 0 && (
        <Card className="mt-4 border-amber/40 bg-amber-soft/40">
          <CardBody className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13.5px] text-ink-2">
              <span className="font-medium text-ink">
                {requested} {requested === 1 ? "person has" : "people have"} registered through your public link.
              </span>{" "}
              Approve each one with an amount before they join a batch.
            </p>
            <ButtonLink href="/app/people" size="sm" variant="secondary" className="shrink-0" trailingIcon={<ArrowRight size={14} />}>
              Review requests
            </ButtonLink>
          </CardBody>
        </Card>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Payout token" description="Your workspace's confidential token, backed by USDC." />
          <CardBody>
            {company.mint ? (
              <a
                href={explorerUrl("address", company.mint)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[13px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                {shortAddress(company.mint, 8)}
              </a>
            ) : (
              <p className="text-[13.5px] text-ink-3">Not created yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Auditor" description="Can decrypt every transfer, cannot move funds." />
          <CardBody>
            <p className="font-mono text-[13px] text-ink">{shortAddress(company.auditorAddress, 8)}</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

interface ChecklistStep {
  key: string;
  icon: ReactNode;
  title: string;
  done: boolean;
  detail: string;
  href: string;
  cta: string;
}

function ChecklistRow({ step, index, active }: { step: ChecklistStep; index: number; active: boolean }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4", !step.done && !active && "opacity-60")}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px]",
            step.done ? "border-green bg-green text-white" : active ? "border-ink text-ink" : "border-line-strong text-ink-3",
          )}
          aria-hidden
        >
          {step.done ? <Check size={14} strokeWidth={2.5} /> : step.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[14px] font-medium", step.done ? "text-ink-3 line-through decoration-line" : "text-ink")}>{step.title}</p>
          <p className="mt-0.5 text-[13px] text-ink-3 text-pretty">{step.detail}</p>
        </div>
      </div>
      <div className="shrink-0 pl-11 sm:pl-0">
        <ButtonLink href={step.href} size="sm" variant={active ? "primary" : "ghost"} trailingIcon={<ArrowRight size={13} />}>
          {step.cta}
        </ButtonLink>
      </div>
    </motion.li>
  );
}

function Stat({ label, hint, loading, children }: { label: string; hint?: string; loading: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardBody className="pt-4">
        <p className="text-[12.5px] font-medium text-ink-3" title={hint}>
          {label}
        </p>
        <div className="mt-1.5 flex min-h-7 items-center">{loading ? <Skeleton className="h-6 w-24" /> : children}</div>
      </CardBody>
    </Card>
  );
}

function RecentBatches({ runs }: { runs: PayrollRun[] }) {
  return (
    <Card className="mt-6">
      <CardHeader
        title="Recent batches"
        description="Each one settled with the amounts encrypted. Open a batch for the per-person receipts."
        action={
          <Link href="/app/payroll" className="text-[13px] font-medium text-ink-2 hover:text-ink">
            All payouts
          </Link>
        }
      />
      <ul className="divide-y divide-line">
        {runs.map((r) => (
          <li key={r.id}>
            <Link href={`/app/payroll/${r.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper-sunken/60">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{r.period}</p>
                <p className="text-[12.5px] text-ink-3">{formatDate(r.completedAt ?? r.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone={runTone[r.status].tone} dot>
                  {runTone[r.status].label}
                </Badge>
                <Amount value={r.total} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
