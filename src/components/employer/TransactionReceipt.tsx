"use client";

import { useEffect, useState } from "react";
import { signature as toSignature } from "@solana/kit";
import { ExternalLink, EyeOff, ShieldCheck } from "lucide-react";
import { Amount, Badge, Dialog, Skeleton } from "@/components/ui";
import { CopyButton } from "@/components/ui/CopyButton";
import { useApp } from "@/components/app/AppContext";
import { fetchTransactionReceipt, type TransactionReceipt as Receipt } from "@/lib/solana/confidentialV1";
import { explorerUrl } from "@/lib/solana/config";
import { shortAddress } from "@/lib/format";

/**
 * What the chain recorded for one payout, read straight from RPC. Works for
 * Transaction V1, which some explorers cannot render yet.
 */
export function TransactionReceipt({
  signature,
  recipient,
  amount,
  open,
  onClose,
}: {
  signature: string | null;
  recipient?: string;
  amount?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { client } = useApp();
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);

  useEffect(() => {
    if (!open || !signature) return;
    let cancelled = false;
    fetchTransactionReceipt(client, toSignature(signature))
      .then((r) => !cancelled && setReceipt(r))
      .catch(() => !cancelled && setReceipt(null));
    return () => {
      cancelled = true;
    };
  }, [open, signature, client]);

  const interesting = (receipt?.logs ?? []).filter(
    (l) => /Verify|ConfidentialTransferInstruction|consumed|success|failed/.test(l) && !/invoke/.test(l),
  );

  return (
    <Dialog open={open} onClose={onClose} title="Private payout receipt" description="The payer can read the record. The public transaction exposes no amount.">
      {!signature ? null : receipt === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : receipt === null ? (
        <p className="text-[13.5px] text-ink-3">Could not load this transaction yet. It may still be propagating.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 rounded-[var(--radius-md)] border border-line bg-paper-sunken/50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">Recipient</p>
              <p className="mt-1 text-[14px] font-medium text-ink">{recipient ?? "Recipient"}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">Payer record</p>
              <p className="mt-1"><Amount value={amount ?? "0"} /></p>
            </div>
            <div className="flex items-start gap-2 text-[12.5px] text-ink-2 sm:col-span-2">
              <EyeOff size={14} className="mt-0.5 shrink-0 text-green" />
              <span><strong className="font-medium text-ink">Public disclosure: none.</strong> Solana records the transfer and verifies its proofs without publishing the amount.</span>
            </div>
            <div className="flex items-start gap-2 text-[12.5px] text-ink-2 sm:col-span-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-green" />
              <span>The recipient can verify this transfer with their own key; the designated auditor can verify every payout.</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={receipt.err ? "red" : "green"} dot>
              {receipt.err ? "Failed" : "Confirmed"}
            </Badge>
            <Badge tone="blue">Transaction {receipt.version === "legacy" ? "legacy" : `v${receipt.version}`}</Badge>
            {receipt.computeUnits !== null && <Badge>{receipt.computeUnits.toLocaleString()} CU</Badge>}
            <Badge>slot {receipt.slot.toLocaleString()}</Badge>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Programs, in order</p>
            <ol className="flex flex-wrap gap-1.5">
              {receipt.programs.map((p, i) => (
                <li key={i} className="rounded-[var(--radius-sm)] bg-paper-inset px-2 py-1 font-mono text-[12px] text-ink-2">
                  {i + 1}. {p}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Log</p>
            <pre className="max-h-48 overflow-auto rounded-[var(--radius-md)] bg-paper-sunken p-3 font-mono text-[11.5px] leading-relaxed text-ink-2">
              {interesting.join("\n")}
            </pre>
          </div>
          <div className="flex items-center justify-between gap-2 text-[12.5px] text-ink-3">
            <span className="font-mono">{shortAddress(signature, 10)}</span>
            <span className="flex items-center gap-1">
              <CopyButton value={signature} variant="ghost" size="sm">
                Copy
              </CopyButton>
              <a href={explorerUrl("tx", signature)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 hover:bg-paper-inset hover:text-ink">
                Explorer <ExternalLink size={11} />
              </a>
            </span>
          </div>
        </div>
      )}
    </Dialog>
  );
}
