"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Input, PageHeader, useToast } from "@/components/ui";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api/client";
import { CLUSTER, VAULT_PROGRAM_ID, explorerUrl } from "@/lib/solana/config";
import { shortAddress } from "@/lib/format";

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 hairline last:shadow-none sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] text-ink-3">{label}</span>
      <span className="flex items-center gap-2">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[13px] text-ink hover:underline">
            {shortAddress(value, 8)} <ExternalLink size={12} className="text-ink-3" />
          </a>
        ) : (
          <span className="font-mono text-[13px] text-ink">{shortAddress(value, 8)}</span>
        )}
        <CopyButton value={value} variant="ghost" size="sm">
          <span className="sr-only">Copy</span>
        </CopyButton>
      </span>
    </div>
  );
}

export function Settings() {
  const { company, account, refresh } = useApp();
  const { toast } = useToast();
  const [name, setName] = useState(company?.name ?? "");
  const [busy, setBusy] = useState(false);

  if (!company) return null;

  const save = async () => {
    if (name.trim().length < 2 || name.trim() === company.name) return;
    setBusy(true);
    try {
      await api.updateCompany(company.id, { name: name.trim() });
      await refresh();
      toast({ tone: "success", title: "Company renamed" });
    } catch (e) {
      toast({ tone: "error", title: "Could not save", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Workspace details and the on-chain facts behind your payouts." />

      <Card>
        <CardHeader title="Company" />
        <CardBody>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </CardBody>
        <CardFooter>
          <Button onClick={save} loading={busy} loadingLabel="Saving…" disabled={name.trim().length < 2 || name.trim() === company.name}>
            Save
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="On-chain"
          description="These were fixed when the workspace was created. Changing the auditor means creating a new payout token."
          action={<Badge tone={CLUSTER === "mainnet-beta" ? "green" : "amber"}>{CLUSTER === "mainnet-beta" ? "Mainnet" : "Devnet"}</Badge>}
        />
        <CardBody>
          {company.mint && <Row label="Payout token" value={company.mint} href={explorerUrl("address", company.mint)} />}
          <Row label="Owner wallet" value={account.address} href={explorerUrl("address", account.address)} />
          <Row label="Auditor wallet" value={company.auditorAddress} href={explorerUrl("address", company.auditorAddress)} />
          {company.auditorElgamalPubkey && <Row label="Auditor key" value={company.auditorElgamalPubkey} />}
          {company.mintSignature && <Row label="Creation transaction" value={company.mintSignature} href={explorerUrl("tx", company.mintSignature)} />}
          {VAULT_PROGRAM_ID && <Row label="Vault program" value={VAULT_PROGRAM_ID} href={explorerUrl("address", VAULT_PROGRAM_ID)} />}
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Privacy" />
        <CardBody>
          <ul className="space-y-2 text-[14px] text-ink-2">
            <li>Payslip stores names, emails, invite links and the amounts you type. It never holds keys or decrypted balances.</li>
            <li>Proofs are generated in your browser. Your wallet signs once per session to derive the keys.</li>
            <li>The explorer shows that transfers happened between accounts. It does not show amounts.</li>
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
