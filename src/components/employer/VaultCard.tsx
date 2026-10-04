"use client";

import { useState } from "react";
import type { Address } from "@solana/kit";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Amount, Badge, Button, Card, CardBody, CardHeader, Input, useToast } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { parseUsd } from "@/lib/domain/money";
import { describeError } from "@/lib/errors";
import { sendInstructions } from "@/lib/solana/send";
import { getUnwrapInstruction, getWrapInstruction, readUsdcBalance, readVaultBalance } from "@/lib/solana/vault";
import type { SolanaClient } from "@/lib/solana/rpc";
import type { WalletSigner } from "@/lib/solana/signers";

/**
 * Wrap USDC into the payout token and back through the vault program.
 * Shown wherever a wallet holds a public payroll balance or USDC.
 */
export function VaultCard({
  client,
  signer,
  mint,
  publicPayroll,
  onChanged,
  mode,
}: {
  client: SolanaClient;
  signer: WalletSigner;
  mint: Address;
  /** The wallet's visible payroll-token balance (what can be unwrapped). */
  publicPayroll: bigint;
  onChanged: () => Promise<unknown> | void;
  /** Employers mostly wrap; employees mostly unwrap. Sets the default tab. */
  mode: "employer" | "employee";
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"wrap" | "unwrap">(mode === "employer" ? "wrap" : "unwrap");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const usdc = useResource(() => readUsdcBalance(client, signer.address), [client, signer.address]);
  const vault = useResource(() => readVaultBalance(client, mint), [client, mint]);

  const submit = async () => {
    let base: bigint;
    try {
      base = parseUsd(amount);
      if (base <= 0n) throw new Error("Enter an amount above zero");
    } catch (e) {
      return toast({ tone: "error", title: "Check the amount", description: e instanceof Error ? e.message : undefined });
    }
    const max = tab === "wrap" ? (usdc.data ?? 0n) : publicPayroll;
    if (base > max) return toast({ tone: "error", title: "Not enough balance for that" });

    setBusy(true);
    try {
      const ix = tab === "wrap" ? await getWrapInstruction(signer, mint, base) : await getUnwrapInstruction(signer, mint, base);
      await sendInstructions(client, signer, [ix]);
      toast({
        tone: "success",
        title: tab === "wrap" ? "USDC wrapped" : "Converted to USDC",
        description: tab === "wrap" ? "Move it to your private balance to pay from it." : "It is now plain USDC in your wallet.",
      });
      setAmount("");
      await Promise.all([usdc.reload(), vault.reload(), onChanged()]);
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: tab === "wrap" ? "Could not wrap" : "Could not convert", description: d.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={tab === "wrap" ? "Add USDC" : "Convert to USDC"}
        description={
          tab === "wrap"
            ? "USDC goes into the workspace vault and you receive the same amount of payout token."
            : "Burns payout token and returns the same amount of USDC from the vault."
        }
        action={
          <div className="flex gap-1 rounded-[var(--radius-md)] bg-paper-inset p-1">
            {(["wrap", "unwrap"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-[6px] px-2.5 py-1 text-[12.5px] font-medium ${tab === t ? "bg-paper-raised text-ink shadow-[var(--shadow-sm)]" : "text-ink-3"}`}
              >
                {t === "wrap" ? "Wrap" : "Unwrap"}
              </button>
            ))}
          </div>
        }
      />
      <CardBody>
        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-3">
          <span>
            Your USDC: <Amount value={usdc.data ?? 0n} size="sm" className="text-ink-2" />
          </span>
          <span>
            Payout token (visible): <Amount value={publicPayroll} size="sm" className="text-ink-2" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            Vault holds <Amount value={vault.data ?? 0n} size="sm" className="text-ink-2" /> <Badge tone="green">1:1 backed</Badge>
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Amount"
            mono
            inputMode="decimal"
            leading={<span className="text-[13px]">$</span>}
            placeholder="1,000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            wrapperClassName="flex-1"
          />
          <Button
            loading={busy}
            loadingLabel={tab === "wrap" ? "Wrapping…" : "Converting…"}
            onClick={submit}
            disabled={!amount}
            leadingIcon={tab === "wrap" ? <ArrowDownToLine size={15} /> : <ArrowUpFromLine size={15} />}
          >
            {tab === "wrap" ? "Wrap USDC" : "Convert to USDC"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
