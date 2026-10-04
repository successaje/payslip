"use client";

import { useState } from "react";
import { Button, Dialog, Input, useToast } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { Employee } from "@/lib/db/schema";
import { formatUsd, parseUsd } from "@/lib/domain/money";

interface Props {
  companyId: string;
  open: boolean;
  onClose: () => void;
  /** When set, edits this person instead of creating one. */
  person?: Employee | null;
  onSaved: (e: Employee) => void;
}

export function PersonDialog({ companyId, open, onClose, person, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      locked={busy}
      title={person ? `Edit ${person.name}` : "Add a person"}
      description={person ? "Changes apply to the next batch." : "They get a link to connect their wallet. You can pay them once they are set up."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="person-form" loading={busy} loadingLabel="Saving…">
            {person ? "Save changes" : "Add person"}
          </Button>
        </>
      }
    >
      {/* The form mounts fresh each time the dialog opens, so its state starts from props. */}
      <PersonForm companyId={companyId} person={person ?? null} onSaved={onSaved} onClose={onClose} setBusy={setBusy} />
    </Dialog>
  );
}

function PersonForm({
  companyId,
  person,
  onSaved,
  onClose,
  setBusy,
}: {
  companyId: string;
  person: Employee | null;
  onSaved: (e: Employee) => void;
  onClose: () => void;
  setBusy: (b: boolean) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [amount, setAmount] = useState(person ? formatUsd(person.amount, { sign: false }) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 1) next.name = "Enter their name";
    try {
      if (parseUsd(amount) <= 0n) next.amount = "Enter an amount above zero";
    } catch {
      next.amount = "Enter an amount like 2,350.00";
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid email";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <>
      <form
        id="person-form"
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!validate()) return;
          setBusy(true);
          try {
            const saved = person
              ? await api.updateEmployee(companyId, person.id, { name: name.trim(), role: role.trim(), email: email.trim(), amount })
              : await api.createEmployee(companyId, { name: name.trim(), role: role.trim(), email: email.trim(), amount });
            onSaved(saved);
            onClose();
          } catch (err) {
            toast({ tone: "error", title: "Could not save", description: err instanceof Error ? err.message : undefined });
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="Name" autoFocus value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Ada Okafor" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Role" labelAside="Optional" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Designer" />
          <Input
            label="Amount per batch"
            mono
            inputMode="decimal"
            leading={<span className="text-[13px]">$</span>}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
            placeholder="2,350.00"
            hint="Salary, invoice, grant or bounty. Paid in USDC, encrypted on-chain."
          />
        </div>
        <Input
          label="Email"
          labelAside="Optional"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="ada@northwind.studio"
          hint="Only used to label the invite. Payslip does not send email yet."
        />
      </form>
    </>
  );
}
