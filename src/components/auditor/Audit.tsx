"use client";

import { useMemo, useState } from "react";
import { signature as toSignature } from "@solana/kit";
import { Check, Download, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Amount, Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, SkeletonRows, useToast } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { api, type AuditRow } from "@/lib/api/client";
import { auditTransferAmount } from "@/lib/solana/confidential";
import { explorerUrl } from "@/lib/solana/config";
import { formatUsd, sum } from "@/lib/domain/money";
import { describeError } from "@/lib/errors";
import { formatDate, shortAddress } from "@/lib/format";
import { cn } from "@/lib/cn";

type Decrypted = { amount: bigint } | { error: string };

/**
 * The auditor's view. The auditor key is derived from the connected wallet
 * with one signature; every transfer amount is then recovered directly from
 * its transaction on-chain and compared with what the employer recorded.
 */
export function Audit({ companyId }: { companyId: string }) {
  const { account, client, signer } = useApp();
  const { toast } = useToast();
  const data = useResource(() => api.audit(companyId), [companyId]);
  const [decrypted, setDecrypted] = useState<Record<string, Decrypted>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const isAuditor = data.data?.company.auditorAddress === account.address;
  const rows = useMemo(() => data.data?.rows ?? [], [data.data]);

  const totals = useMemo(() => {
    const ok = rows.filter((r) => "amount" in (decrypted[r.paymentId] ?? {}));
    const onChain = sum(ok.map((r) => (decrypted[r.paymentId] as { amount: bigint }).amount));
    const recorded = sum(rows.map((r) => BigInt(r.recordedAmount)));
    const mismatches = ok.filter((r) => (decrypted[r.paymentId] as { amount: bigint }).amount !== BigInt(r.recordedAmount)).length;
    return { onChain, recorded, verified: ok.length, mismatches };
  }, [rows, decrypted]);

  const decryptAll = async () => {
    setBusy(true);
    setProgress(0);
    try {
      for (const [i, r] of rows.entries()) {
        try {
          const amount = await auditTransferAmount(client, signer, toSignature(r.signature));
          setDecrypted((d) => ({ ...d, [r.paymentId]: { amount } }));
        } catch (e) {
          const d = describeError(e);
          if (d.cancelled) throw e;
          setDecrypted((prev) => ({ ...prev, [r.paymentId]: { error: d.message } }));
        }
        setProgress(i + 1);
      }
      toast({ tone: "success", title: "Audit complete", description: `${rows.length} ${rows.length === 1 ? "transfer" : "transfers"} decrypted from chain.` });
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Audit stopped", description: d.message });
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const lines = [
      ["period", "person", "wallet", "recorded_usd", "onchain_usd", "signature", "paid_at"].join(","),
      ...rows.map((r) => {
        const d = decrypted[r.paymentId];
        const onChain = d && "amount" in d ? formatUsd(d.amount, { sign: false }) : "";
        return [r.period, `"${r.employeeName}"`, r.employeeWallet ?? "", formatUsd(r.recordedAmount, { sign: false }), onChain, r.signature, r.paidAt ?? ""].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payslip-audit-${data.data?.company.name ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (data.status === "error") {
    return <EmptyState title="Could not load audit data" description={data.error} action={<Button variant="secondary" onClick={data.reload}>Try again</Button>} />;
  }

  return (
    <>
      <PageHeader
        title="Audit"
        description={
          data.data
            ? isAuditor
              ? `You hold the auditor key for ${data.data.company.name}. You can read every salary; you cannot move a cent.`
              : `${shortAddress(data.data.company.auditorAddress, 6)} holds the auditor key for ${data.data.company.name}.`
            : undefined
        }
        actions={
          isAuditor && rows.length > 0 ? (
            <>
              <Button variant="secondary" leadingIcon={<Download size={14} />} onClick={exportCsv} disabled={busy}>
                Export CSV
              </Button>
              <Button leadingIcon={<ShieldCheck size={15} />} loading={busy} loadingLabel={`Decrypting ${progress}/${rows.length}…`} onClick={decryptAll}>
                Decrypt all transfers
              </Button>
            </>
          ) : null
        }
      />

      {data.data && !isAuditor && (
        <Card className="mb-4">
          <CardBody className="pt-5">
            <p className="text-[14px] text-ink-2 text-pretty">
              Connect the auditor wallet to decrypt amounts. The key is derived from that wallet with one signature and
              never leaves the browser. Anyone else, including Payslip, sees only encrypted numbers.
            </p>
          </CardBody>
        </Card>
      )}

      {isAuditor && totals.verified > 0 && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader title="Verified on-chain" />
            <CardBody>
              <Amount value={totals.onChain} size="lg" />
              <p className="mt-1 text-[12.5px] text-ink-3">{totals.verified} of {rows.length} {rows.length === 1 ? "transfer" : "transfers"}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Recorded by employer" />
            <CardBody>
              <Amount value={totals.recorded} size="lg" />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Mismatches" />
            <CardBody>
              <p className={cn("font-mono text-[20px] tnum", totals.mismatches ? "text-red" : "text-green")}>{totals.mismatches}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">{totals.mismatches ? "Investigate" : "Books match the chain"}</p>
            </CardBody>
          </Card>
        </div>
      )}

      {data.status === "loading" ? (
        <Card className="px-5">
          <SkeletonRows rows={3} />
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={18} />} title="Nothing to audit yet" description="Once payroll has run, every transfer will be listed here with its signature." />
      ) : (
        <Card>
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3 md:grid hairline">
            <span>Person</span>
            <span>Period</span>
            <span className="text-right">Recorded</span>
            <span className="text-right">On-chain</span>
            <span className="w-24 text-right">Tx</span>
          </div>
          <ul>
            {rows.map((r: AuditRow) => {
              const d = decrypted[r.paymentId];
              const ok = d && "amount" in d;
              const mismatch = ok && d.amount !== BigInt(r.recordedAmount);
              return (
                <li key={r.paymentId} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 hairline last:shadow-none md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{r.employeeName}</p>
                    <p className="font-mono text-[12px] text-ink-3">{r.employeeWallet ? shortAddress(r.employeeWallet) : "—"}</p>
                  </div>
                  <div className="order-3 text-[13px] text-ink-2 md:order-none">
                    {r.period}
                    {r.paidAt && <span className="text-ink-3"> · {formatDate(r.paidAt)}</span>}
                  </div>
                  <div className="text-right">
                    <Amount value={r.recordedAmount} hidden={!isAuditor} />
                  </div>
                  <div className="order-4 flex items-center justify-end gap-1.5 md:order-none">
                    {ok ? (
                      <>
                        {mismatch ? <TriangleAlert size={13} className="text-red" /> : <Check size={13} className="text-green" />}
                        <Amount value={d.amount} className={mismatch ? "text-red" : undefined} />
                      </>
                    ) : d && "error" in d ? (
                      <Badge tone="red">{d.error}</Badge>
                    ) : (
                      <Amount value={null} />
                    )}
                  </div>
                  <div className="order-5 text-right md:order-none md:w-24">
                    <a href={explorerUrl("tx", r.signature)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
                      {shortAddress(r.signature, 4)} <ExternalLink size={11} />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
