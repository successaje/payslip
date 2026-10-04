"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Receipt } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Amount, Badge, Button, Card, EmptyState, PageHeader, SkeletonRows, type Tone } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { api } from "@/lib/api/client";
import type { PayrollRun, RunStatus } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { NewRunDialog } from "./NewRunDialog";

export const runTone: Record<RunStatus, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Not started" },
  running: { tone: "amber", label: "In progress" },
  completed: { tone: "green", label: "Completed" },
  partial: { tone: "amber", label: "Needs attention" },
  failed: { tone: "red", label: "Failed" },
};

export function Payroll() {
  const { company } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const runs = useResource(() => (company ? api.listRuns(company.id) : Promise.resolve([] as PayrollRun[])), [company?.id]);

  if (!company) return null;
  const hasOpen = runs.data?.some((r) => r.status === "draft" || r.status === "running");

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Each batch pays everyone who is set up, with amounts encrypted on-chain."
        actions={
          <Button leadingIcon={<Plus size={16} />} onClick={() => setOpen(true)} disabled={Boolean(hasOpen)}>
            New batch
          </Button>
        }
      />

      {runs.status === "error" ? (
        <EmptyState title="Could not load runs" description={runs.error} action={<Button variant="secondary" onClick={runs.reload}>Try again</Button>} />
      ) : runs.status === "loading" ? (
        <Card className="px-5">
          <SkeletonRows rows={3} />
        </Card>
      ) : runs.data.length === 0 ? (
        <EmptyState
          icon={<Receipt size={18} />}
          title="No payouts yet"
          description="Start a batch to pay everyone who has finished setup. You will see each payment confirm, and the amounts will not be visible on-chain."
          action={
            <Button leadingIcon={<Plus size={16} />} onClick={() => setOpen(true)}>
              Send first batch
            </Button>
          }
        />
      ) : (
        <Card>
          <ul>
            {runs.data.map((r) => {
              const t = runTone[r.status];
              return (
                <li key={r.id} className="hairline last:shadow-none">
                  <Link
                    href={`/app/payroll/${r.id}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-sunken/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{r.period}</p>
                      <p className="text-[12.5px] text-ink-3">
                        {r.status === "completed" && r.completedAt ? `Paid ${formatDate(r.completedAt)}` : `Created ${formatDate(r.createdAt)}`}
                      </p>
                    </div>
                    <Badge tone={t.tone} dot pulse={r.status === "running"}>
                      {t.label}
                    </Badge>
                    <div className="flex items-center gap-3">
                      <Amount value={r.total} />
                      <ArrowRight size={15} className="text-ink-4" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <NewRunDialog
        companyId={company.id}
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(run) => {
          setOpen(false);
          router.push(`/app/payroll/${run.id}`);
        }}
      />
    </>
  );
}
