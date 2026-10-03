"use client";

import { useState } from "react";
import Link from "next/link";
import { address as toAddress } from "@solana/kit";
import { ArrowRight, ArrowUpFromLine, Download, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Amount, Badge, Button, Card, CardBody, CardHeader, Dialog, EmptyState, Input, PageHeader, Skeleton, useToast } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { api } from "@/lib/api/client";
import { readHolderState } from "@/lib/solana/accounts";
import { applyPending, decryptAvailableBalance, withdrawToPublic } from "@/lib/solana/confidential";
import { explorerUrl } from "@/lib/solana/config";
import { parseUsd } from "@/lib/domain/money";
import { describeError } from "@/lib/errors";
import { formatDate, shortAddress } from "@/lib/format";

/**
 * Employee home. Balance is decrypted locally with the wallet's keys;
 * nothing about the amount is sent anywhere.
 */
export function MyPay({ full = false }: { full?: boolean }) {
  const { account, client, signer, me } = useApp();
  const { toast } = useToast();
  const membership = me.memberships[0];
  const mint = membership?.company.mint ? toAddress(membership.company.mint) : null;

  const payslips = useResource(() => api.myPayslips(), [account.address]);
  const holder = useResource(
    () => (mint ? readHolderState(client, toAddress(account.address), mint) : Promise.reject(new Error("No payroll token"))),
    [client, account.address, mint],
  );

  const [balance, setBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState<"reveal" | "apply" | "withdraw" | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  if (!membership || !mint) {
    return (
      <EmptyState
        title="You are not on anyone's payroll yet"
        description="When a company invites you, open their link and your pay will show up here."
      />
    );
  }

  const reveal = async () => {
    setBusy("reveal");
    try {
      setBalance(await decryptAvailableBalance(client, signer, mint));
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Could not decrypt balance", description: d.message });
    } finally {
      setBusy(null);
    }
  };

  const confirmIncoming = async () => {
    setBusy("apply");
    try {
      await applyPending(client, signer, mint);
      toast({ tone: "success", title: "Pay received", description: "Your balance is updated." });
      await holder.reload();
      await reveal();
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Could not confirm", description: d.message });
    } finally {
      setBusy(null);
    }
  };

  const withdraw = async () => {
    let base: bigint;
    try {
      base = parseUsd(withdrawAmount);
    } catch {
      return toast({ tone: "error", title: "Enter an amount like 500.00" });
    }
    if (balance !== null && base > balance) return toast({ tone: "error", title: "That is more than your private balance" });
    setBusy("withdraw");
    try {
      await withdrawToPublic(client, signer, mint, base);
      toast({ tone: "success", title: "Moved to spendable balance", description: "It now shows as a normal token balance in your wallet." });
      setWithdrawOpen(false);
      setWithdrawAmount("");
      await holder.reload();
      await reveal();
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Withdrawal failed", description: d.message });
    } finally {
      setBusy(null);
    }
  };

  const pending = holder.data?.pendingCredits ?? 0n;
  const mine = payslips.data?.find((p) => p.company.id === membership.company.id);
  const list = full ? (mine?.payments ?? []) : (mine?.payments ?? []).slice(0, 5);

  return (
    <>
      <PageHeader
        title={full ? "Payslips" : "My pay"}
        description={full ? `Everything ${membership.company.name} has paid you.` : `From ${membership.company.name}. Only you can read these numbers.`}
        actions={
          <Button variant="secondary" leadingIcon={<RefreshCw size={14} />} onClick={() => Promise.all([holder.reload(), payslips.reload()])}>
            Refresh
          </Button>
        }
      />

      {!full && (
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader
              title="Private balance"
              description="Encrypted on-chain. Decrypted here with your wallet, never sent anywhere."
              action={pending > 0n ? <Badge tone="green" dot pulse>Pay arrived</Badge> : null}
            />
            <CardBody>
              {pending > 0n ? (
                <div className="mb-4 rounded-[var(--radius-md)] border border-green/30 bg-green-soft p-3.5">
                  <p className="text-[14px] font-medium text-green-ink">You have new pay waiting</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">Confirm it to add it to your balance. One signature.</p>
                  <Button size="sm" className="mt-3" loading={busy === "apply"} loadingLabel="Confirming…" onClick={confirmIncoming} leadingIcon={<Download size={14} />}>
                    Confirm receipt
                  </Button>
                </div>
              ) : null}
              {balance === null ? (
                <Button variant="secondary" leadingIcon={<Lock size={14} />} loading={busy === "reveal"} loadingLabel="Decrypting…" onClick={reveal}>
                  Reveal my balance
                </Button>
              ) : (
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <Amount value={balance} size="xl" />
                  <Button variant="secondary" leadingIcon={<ArrowUpFromLine size={14} />} onClick={() => setWithdrawOpen(true)} disabled={balance === 0n}>
                    Withdraw
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Spendable balance" description="Visible like any token. Send it anywhere." />
            <CardBody>
              {holder.data ? <Amount value={holder.data.publicAmount} size="xl" /> : <Skeleton className="h-9 w-32" />}
              <p className="mt-2 font-mono text-[12px] text-ink-3">{shortAddress(account.address, 6)}</p>
            </CardBody>
          </Card>
        </div>
      )}

      <Card className={full ? "" : "mt-4"}>
        {!full && <CardHeader title="Recent payslips" action={<Link href="/app/me/payslips" className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">All <ArrowRight size={13} /></Link>} />}
        {payslips.status === "loading" ? (
          <CardBody>
            <Skeleton className="h-10 w-full" />
          </CardBody>
        ) : list.length === 0 ? (
          <CardBody>
            <p className="text-[13.5px] text-ink-3">Nothing yet. When {membership.company.name} runs payroll, it shows up here.</p>
          </CardBody>
        ) : (
          <ul>
            {list.map((p) => (
              <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 hairline last:shadow-none">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{p.period}</p>
                  <p className="text-[12.5px] text-ink-3">
                    {p.paidAt ? formatDate(p.paidAt) : ""}
                    {p.signature && (
                      <>
                        {" · "}
                        <a href={explorerUrl("tx", p.signature)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono hover:text-ink">
                          {shortAddress(p.signature, 4)} <ExternalLink size={10} />
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <Amount value={p.amount} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        locked={busy === "withdraw"}
        size="sm"
        title="Withdraw to spendable balance"
        description="Moves money from your private balance to a normal, visible token balance."
        footer={
          <>
            <Button variant="ghost" onClick={() => setWithdrawOpen(false)} disabled={busy === "withdraw"}>
              Cancel
            </Button>
            <Button loading={busy === "withdraw"} loadingLabel="Withdrawing…" onClick={withdraw}>
              Withdraw
            </Button>
          </>
        }
      >
        <Input
          label="Amount"
          mono
          inputMode="decimal"
          leading={<span className="text-[13px]">$</span>}
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          hint={balance !== null ? <>Available: <Amount value={balance} size="sm" className="text-ink-3" /></> : undefined}
          autoFocus
        />
      </Dialog>
    </>
  );
}
