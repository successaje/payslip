"use client";

import { useMemo, useState } from "react";
import { Link2, Mail, MoreHorizontal, Plus, UserPlus, Users } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Amount, Badge, Button, Card, EmptyState, PageHeader, SkeletonRows, useToast } from "@/components/ui";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api/client";
import type { Employee } from "@/lib/db/schema";
import { APP_URL } from "@/lib/solana/config";
import { shortAddress } from "@/lib/format";
import { sum } from "@/lib/domain/money";
import { useResource } from "@/hooks/useResource";
import { PersonDialog } from "./PersonDialog";
import { RowMenu } from "./RowMenu";

function inviteUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : APP_URL;
  return `${base}/join/${token}`;
}

function inviteMailto(p: Employee, company: string, url: string) {
  const subject = `${company} wants to pay you privately with Payslip`;
  const body = [
    `Hi ${p.name.split(" ")[0]},`,
    "",
    `${company} is setting up private payouts on Payslip. Open this link, connect the wallet you want to be paid to, and follow the two prompts. It takes about a minute.`,
    "",
    url,
    "",
    "Only you can see your payout amounts. The company's auditor can verify them. Nobody else can.",
  ].join("\n");
  return `mailto:${encodeURIComponent(p.email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function StatusBadge({ e }: { e: Employee }) {
  if (e.status === "active") return <Badge tone="green" dot>Ready</Badge>;
  return <Badge tone="amber" dot>Invited</Badge>;
}

export function People() {
  const { company } = useApp();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ open: boolean; person: Employee | null }>({ open: false, person: null });
  const resource = useResource(() => (company ? api.listEmployees(company.id) : Promise.resolve([])), [company?.id]);
  const people = resource.data;
  const error = resource.error;
  const load = resource.reload;

  const totals = useMemo(() => {
    const list = people ?? [];
    return {
      monthly: sum(list.map((p) => BigInt(p.amount))),
      ready: list.filter((p) => p.status === "active").length,
      invited: list.filter((p) => p.status === "invited").length,
    };
  }, [people]);

  if (!company) return null;

  const upsert = (saved: Employee) =>
    resource.mutate((l) => (l.some((p) => p.id === saved.id) ? l.map((p) => (p.id === saved.id ? saved : p)) : [...l, saved]));

  const remove = async (p: Employee) => {
    try {
      await api.updateEmployee(company.id, p.id, { status: "removed" });
      resource.mutate((l) => l.filter((x) => x.id !== p.id));
      toast({ title: `${p.name} removed`, description: "They will not be included in future runs." });
    } catch (e) {
      toast({ tone: "error", title: "Could not remove", description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <>
      <PageHeader
        title="People"
        description={
          people && people.length
            ? `${people.length} ${people.length === 1 ? "person" : "people"} · ${totals.ready} ready · ${totals.invited} invited`
            : "Everyone you pay, and whether they are set up to receive private pay."
        }
        actions={
          <Button leadingIcon={<Plus size={16} />} onClick={() => setDialog({ open: true, person: null })}>
            Add person
          </Button>
        }
      />

      {error ? (
        <EmptyState title="Could not load people" description={error} action={<Button variant="secondary" onClick={load}>Try again</Button>} />
      ) : people === null ? (
        <Card className="px-5">
          <SkeletonRows rows={4} />
        </Card>
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users size={18} />}
          title="No one here yet"
          description="Add the people you pay. Each one gets a private invite link; once they connect a wallet they can be paid."
          action={
            <Button leadingIcon={<UserPlus size={16} />} onClick={() => setDialog({ open: true, person: null })}>
              Add your first person
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3 md:grid hairline">
            <span>Person</span>
            <span>Status</span>
            <span className="text-right">Per batch</span>
            <span className="w-24" />
          </div>
          <ul>
            {people.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 hairline last:shadow-none md:grid-cols-[1.6fr_1fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{p.name}</p>
                  <p className="truncate text-[12.5px] text-ink-3">
                    {p.role ?? "—"}
                    {p.walletAddress && (
                      <>
                        {" · "}
                        <span className="font-mono">{shortAddress(p.walletAddress)}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="order-3 md:order-none">
                  <StatusBadge e={p} />
                </div>
                <div className="text-right">
                  <Amount value={p.amount} />
                </div>
                <div className="order-4 flex items-center justify-end gap-1 md:order-none md:w-24">
                  {p.status === "invited" && (
                    <CopyButton value={inviteUrl(p.inviteToken)} size="sm" variant="ghost" className="hidden sm:inline-flex">
                      <span className="sr-only sm:not-sr-only">Invite link</span>
                    </CopyButton>
                  )}
                  <RowMenu
                    trigger={<MoreHorizontal size={16} />}
                    items={[
                      ...(p.status === "invited"
                        ? [
                            {
                              label: "Copy invite link",
                              icon: <Link2 size={14} />,
                              onSelect: async () => {
                                await navigator.clipboard.writeText(inviteUrl(p.inviteToken));
                                toast({ tone: "success", title: "Invite link copied", description: `Send it to ${p.name}.` });
                              },
                            },
                            {
                              label: "Email invite",
                              icon: <Mail size={14} />,
                              onSelect: () => {
                                window.location.href = inviteMailto(p, company.name, inviteUrl(p.inviteToken));
                              },
                            },
                          ]
                        : []),
                      { label: "Edit", onSelect: () => setDialog({ open: true, person: p }) },
                      { label: "Remove", tone: "danger" as const, onSelect: () => remove(p) },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-5 py-3 text-[13px] text-ink-3">
            <span>Batch total</span>
            <Amount value={totals.monthly} className="text-ink-2" />
          </div>
        </Card>
      )}

      <PersonDialog
        companyId={company.id}
        open={dialog.open}
        person={dialog.person}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={(saved) => {
          upsert(saved);
          if (!dialog.person) {
            toast({
              tone: "success",
              title: `${saved.name} added`,
              description: "Copy their invite link and send it to them.",
              action: { label: "Copy invite link", onClick: () => void navigator.clipboard.writeText(inviteUrl(saved.inviteToken)) },
            });
          }
        }}
      />
    </>
  );
}
