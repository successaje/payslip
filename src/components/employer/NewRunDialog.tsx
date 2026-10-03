"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Amount, Button, Dialog, Input, Skeleton, useToast } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { api } from "@/lib/api/client";
import type { Employee, PayrollRun } from "@/lib/db/schema";
import { sum } from "@/lib/domain/money";
import { periodLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (run: PayrollRun) => void;
}

export function NewRunDialog({ companyId, open, onClose, onCreated }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="New payroll run" description="Choose who to include. Only people who finished setup can be paid.">
      <NewRunForm companyId={companyId} onClose={onClose} onCreated={onCreated} />
    </Dialog>
  );
}

function NewRunForm({ companyId, onClose, onCreated }: Omit<Props, "open">) {
  const { toast } = useToast();
  const peopleResource = useResource(() => api.listEmployees(companyId), [companyId]);
  const people: Employee[] | null = peopleResource.data;
  const [period, setPeriod] = useState(periodLabel());
  // null means "everyone who is ready", the default until the user changes it.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = useMemo(() => (people ?? []).filter((p) => p.status === "active"), [people]);
  const waiting = useMemo(() => (people ?? []).filter((p) => p.status === "invited"), [people]);
  const selected = useMemo(() => picked ?? new Set(ready.map((p) => p.id)), [picked, ready]);
  const total = useMemo(() => sum(ready.filter((p) => selected.has(p.id)).map((p) => BigInt(p.amount))), [ready, selected]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setPicked(n);
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (selected.size === 0) return;
        setBusy(true);
        try {
          const { run } = await api.createRun(companyId, { period: period.trim(), employeeIds: [...selected] });
          onCreated(run);
        } catch (err) {
          toast({ tone: "error", title: "Could not start run", description: err instanceof Error ? err.message : undefined });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} hint="Shown on everyone's payslip." />

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink">Who to pay</p>
        {people === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : ready.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong p-3 text-[13px] text-ink-3">
            No one has finished setup yet. Share invite links from{" "}
            <Link href="/app/people" className="text-ink underline underline-offset-2">
              People
            </Link>
            .
          </p>
        ) : (
          <ul className="max-h-64 overflow-auto rounded-[var(--radius-md)] border border-line">
            {ready.map((p) => (
              <li key={p.id} className="hairline last:shadow-none">
                <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-paper-sunken/60")}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--ink)]"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-ink">{p.name}</span>
                    {p.role && <span className="block text-[12px] text-ink-3">{p.role}</span>}
                  </span>
                  <Amount value={p.amount} size="sm" />
                </label>
              </li>
            ))}
          </ul>
        )}
        {waiting.length > 0 && (
          <p className="mt-2 text-[12.5px] text-ink-3">
            {waiting.length} {waiting.length === 1 ? "person has" : "people have"} not finished setup and will be skipped.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-ink-3">
          {selected.size} {selected.size === 1 ? "person" : "people"} · total
        </span>
        <Amount value={total} size="lg" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} loadingLabel="Creating…" disabled={selected.size === 0}>
          Create run
        </Button>
      </div>
    </form>
  );
}
