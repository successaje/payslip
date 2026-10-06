"use client";

import { useState } from "react";
import { Link2, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, useToast } from "@/components/ui";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api/client";
import type { Company } from "@/lib/db/schema";
import { APP_URL } from "@/lib/solana/config";

export function claimUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : APP_URL;
  return `${base}/claim/${token}`;
}

/**
 * The workspace's public self-registration link, for bounties, grants and
 * open contributor programs where the recipient list is not known upfront.
 */
export function PublicLinkCard({ company, onChanged }: { company: Company; onChanged: () => Promise<unknown> | void }) {
  const { toast } = useToast();
  const [label, setLabel] = useState(company.claimLabel ?? "");
  const [busy, setBusy] = useState(false);
  const enabled = Boolean(company.claimToken);

  const update = async (body: { enabled: boolean; label?: string; rotate?: boolean }, msg: string) => {
    setBusy(true);
    try {
      await api.updateClaimLink(company.id, body);
      await onChanged();
      toast({ tone: "success", title: msg });
    } catch (e) {
      toast({ tone: "error", title: "Could not update the link", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Public link"
        description="Anyone with this link can register a wallet to be paid. You approve each request and set the amount. Built for bounties, grants and open contributor programs."
        action={enabled ? <Badge tone="green" dot>Live</Badge> : <Badge>Off</Badge>}
      />
      <CardBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="What it is for"
            labelAside="Shown on the page"
            placeholder="Q4 documentation bounties"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            wrapperClassName="flex-1"
            maxLength={80}
          />
          {enabled ? (
            <div className="flex gap-2">
              <Button variant="secondary" loading={busy} onClick={() => update({ enabled: true, label }, "Label saved")}>
                Save label
              </Button>
              <Button variant="ghost" loading={busy} onClick={() => update({ enabled: false }, "Link turned off")}>
                Turn off
              </Button>
            </div>
          ) : (
            <Button leadingIcon={<Link2 size={15} />} loading={busy} loadingLabel="Creating…" onClick={() => update({ enabled: true, label }, "Public link is live")}>
              Create link
            </Button>
          )}
        </div>
        {enabled && company.claimToken && (
          <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-md)] bg-paper-sunken p-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="break-all font-mono text-[12.5px] text-ink">{claimUrl(company.claimToken)}</code>
            <div className="flex shrink-0 gap-1">
              <CopyButton value={claimUrl(company.claimToken)}>Copy link</CopyButton>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<RefreshCw size={13} />}
                loading={busy}
                onClick={() => update({ enabled: true, rotate: true }, "New link issued. The old one no longer works.")}
              >
                New link
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
