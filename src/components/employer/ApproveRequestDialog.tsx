"use client";

import { useState } from "react";
import { Button, Dialog, Input, useToast } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { Employee } from "@/lib/db/schema";
import { parseUsd } from "@/lib/domain/money";
import { shortAddress } from "@/lib/format";

/** Approve a self-registered recipient by setting what they get per batch. */
export function ApproveRequestDialog({
  companyId,
  person,
  onClose,
  onApproved,
}: {
  companyId: string;
  person: Employee | null;
  onClose: () => void;
  onApproved: (e: Employee) => void;
}) {
  return (
    <Dialog
      open={person !== null}
      onClose={onClose}
      size="sm"
      title={person ? `Approve ${person.name}` : ""}
      description={person ? `${shortAddress(person.walletAddress ?? "", 6)}${person.note ? ` · ${person.note}` : ""}` : undefined}
    >
      {person && <ApproveForm key={person.id} companyId={companyId} person={person} onClose={onClose} onApproved={onApproved} />}
    </Dialog>
  );
}

function ApproveForm({ companyId, person, onClose, onApproved }: { companyId: string; person: Employee; onClose: () => void; onApproved: (e: Employee) => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [role, setRole] = useState(person.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          if (parseUsd(amount) <= 0n) throw new Error();
        } catch {
          return setError("Enter an amount like 500.00");
        }
        setBusy(true);
        try {
          const saved = await api.updateEmployee(companyId, person.id, { amount, role: role.trim(), status: "active" });
          onApproved(saved);
          onClose();
          toast({ tone: "success", title: `${person.name} approved`, description: "They will be included in the next batch." });
        } catch (err) {
          toast({ tone: "error", title: "Could not approve", description: err instanceof Error ? err.message : undefined });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input
        label="Amount per batch"
        mono
        inputMode="decimal"
        leading={<span className="text-[13px]">$</span>}
        placeholder="500.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={error}
        autoFocus
      />
      <Input label="Label" labelAside="Optional" placeholder="Bounty #42" value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} loadingLabel="Approving…">
          Approve
        </Button>
      </div>
    </form>
  );
}
