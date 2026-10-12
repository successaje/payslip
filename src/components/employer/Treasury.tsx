"use client";

import { useState } from "react";
import { address as toAddress } from "@solana/kit";
import { getMintToInstruction } from "@solana-program/token-2022";
import { ArrowDownToLine, Lock, RefreshCw } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Amount, Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Skeleton, useToast } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { readHolderState } from "@/lib/solana/accounts";
import { applyPending, configureConfidentialAccount, decryptAvailableBalance, depositToConfidential } from "@/lib/solana/confidential";
import { sendInstructions } from "@/lib/solana/send";
import { CLUSTER, VAULT_PROGRAM_ID } from "@/lib/solana/config";
import { VaultCard } from "./VaultCard";
import { FaucetButton } from "@/components/wallet/FaucetButton";
import { parseUsd } from "@/lib/domain/money";
import { describeError } from "@/lib/errors";

/**
 * The workspace treasury: a public balance of the payout token, and a private
 * (confidential) balance that payroll is paid from. Funding on devnet mints
 * test funds directly because the employer wallet is the mint authority;
 * the vault program replaces this with wrapping USDC.
 */
export function Treasury() {
  const { company, account, signer, client } = useApp();
  const { toast } = useToast();
  const [privateBalance, setPrivateBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState<"mint" | "deposit" | "reveal" | "configure" | null>(null);
  const [amount, setAmount] = useState("");
  const mint = company?.mint ? toAddress(company.mint) : null;

  const holderResource = useResource(
    () => (mint ? readHolderState(client, toAddress(account.address), mint) : Promise.reject(new Error("No mint"))),
    [client, account.address, mint],
  );
  const holder = holderResource.data;
  const refresh = holderResource.reload;

  if (!company || !mint) return null;

  const configure = async () => {
    setBusy("configure");
    try {
      await configureConfidentialAccount(client, signer, mint);
      toast({ tone: "success", title: "Treasury ready", description: "You can now hold a private balance." });
      await refresh();
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Could not prepare treasury", description: d.message });
    } finally {
      setBusy(null);
    }
  };

  const reveal = async () => {
    setBusy("reveal");
    try {
      setPrivateBalance(await decryptAvailableBalance(client, signer, mint));
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Could not read private balance", description: d.message });
    } finally {
      setBusy(null);
    }
  };

  const mintTestFunds = async () => {
    let base: bigint;
    try {
      base = parseUsd(amount);
    } catch (e) {
      return toast({ tone: "error", title: "Enter an amount like 10,000.00", description: e instanceof Error ? e.message : undefined });
    }
    setBusy("mint");
    try {
      if (!holder) throw new Error("Treasury not loaded");
      await sendInstructions(client, signer, [
        getMintToInstruction({ mint, token: holder.token, mintAuthority: signer, amount: base }),
      ]);
      toast({ tone: "success", title: "Test funds added", description: "Move them to your private balance to pay from them." });
      setAmount("");
      await refresh();
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Could not add funds", description: d.message });
    } finally {
      setBusy(null);
    }
  };

  const moveToPrivate = async () => {
    if (!holder || holder.publicAmount === 0n) return;
    setBusy("deposit");
    try {
      await depositToConfidential(client, signer, mint, holder.publicAmount);
      await applyPending(client, signer, mint);
      toast({ tone: "success", title: "Moved to private balance", description: "Payouts are sent from here." });
      await refresh();
      await reveal();
    } catch (e) {
      const d = describeError(e);
      if (!d.cancelled) toast({ tone: "error", title: "Could not move funds", description: d.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Treasury"
        description="Payouts are sent from your private balance. Only you can read it; the explorer sees an encrypted number."
        actions={
          <Button variant="secondary" leadingIcon={<RefreshCw size={14} />} onClick={refresh}>
            Refresh
          </Button>
        }
      />

      {holder && !holder.configured && (
        <Card className="mb-4">
          <CardHeader title="Prepare your treasury account" description="One signature and one transaction. This registers a private balance for your wallet on the payout token." />
          <CardBody>
            <Button loading={busy === "configure"} loadingLabel="Preparing…" onClick={configure}>
              Prepare treasury
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Private balance" description="Encrypted on-chain. Decrypting needs one signature." />
          <CardBody>
            {privateBalance === null ? (
              <Button variant="secondary" leadingIcon={<Lock size={14} />} loading={busy === "reveal"} loadingLabel="Decrypting…" onClick={reveal}>
                Reveal balance
              </Button>
            ) : (
              <Amount value={privateBalance} size="xl" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Public balance"
            description="Visible to anyone. Move it to private before sending payouts."
            action={holder && !holder.configured ? <Badge tone="amber">Not configured</Badge> : null}
          />
          <CardBody>
            {holder === null ? (
              <Skeleton className="h-9 w-40" />
            ) : (
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Amount value={holder.publicAmount} size="xl" />
                <Button
                  leadingIcon={<ArrowDownToLine size={15} />}
                  disabled={holder.publicAmount === 0n}
                  loading={busy === "deposit"}
                  loadingLabel="Moving…"
                  onClick={moveToPrivate}
                >
                  Move to private
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {VAULT_PROGRAM_ID && holder?.configured && (
        <div className="mt-4">
          <VaultCard client={client} signer={signer} mint={mint} publicPayroll={holder.publicAmount} onChanged={refresh} mode="employer" />
        </div>
      )}

      {CLUSTER === "devnet" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-3">
          <p className="text-[13px] text-ink-3">Devnet: need SOL for fees or test USDC to wrap?</p>
          <FaucetButton size="sm" onFunded={() => void refresh()} />
        </div>
      )}

      {CLUSTER === "devnet" && !VAULT_PROGRAM_ID && (
        <Card className="mt-4 border-dashed">
          <CardHeader
            title="Add test funds"
            description="Devnet only, and only while no vault program is configured. Your wallet is the mint authority, so it can create test payout dollars."
            action={<Badge tone="amber">Devnet</Badge>}
          />
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                label="Amount"
                mono
                inputMode="decimal"
                leading={<span className="text-[13px]">$</span>}
                placeholder="10,000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                wrapperClassName="flex-1"
              />
              <Button loading={busy === "mint"} loadingLabel="Adding…" onClick={mintTestFunds} disabled={!amount}>
                Add test funds
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
