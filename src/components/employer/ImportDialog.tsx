"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, Download, FileUp, Upload } from "lucide-react";
import { Amount, Badge, Button, Dialog, Textarea, useToast } from "@/components/ui";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api/client";
import type { Employee } from "@/lib/db/schema";
import { IMPORT_TEMPLATE, previewImport, type ImportRow } from "@/lib/domain/csvImport";
import { formatUsd } from "@/lib/domain/money";
import { cn } from "@/lib/cn";

/**
 * Import a roster from CSV. Paste or drop a file, see every row judged before
 * anything is saved, import the valid ones in a single request, then copy or
 * download the invite links.
 */
export function ImportDialog({
  companyId,
  open,
  onClose,
  existing,
  inviteUrl,
  onImported,
}: {
  companyId: string;
  open: boolean;
  onClose: () => void;
  existing: Employee[];
  inviteUrl: (token: string) => string;
  onImported: (people: Employee[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      locked={busy}
      size="lg"
      title="Import people from CSV"
      description="Columns: name, email, role, amount. A header row is optional. Everyone imported gets an invite link; nothing is paid until they connect a wallet."
    >
      {open && <ImportFlow key="flow" companyId={companyId} existing={existing} inviteUrl={inviteUrl} onImported={onImported} onClose={onClose} setBusy={setBusy} busy={busy} />}
    </Dialog>
  );
}

function ImportFlow({
  companyId,
  existing,
  inviteUrl,
  onImported,
  onClose,
  setBusy,
  busy,
}: {
  companyId: string;
  existing: Employee[];
  inviteUrl: (token: string) => string;
  onImported: (people: Employee[]) => void;
  onClose: () => void;
  setBusy: (b: boolean) => void;
  busy: boolean;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<Employee[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const roster = useMemo(() => existing.filter((e) => e.status !== "removed").map((e) => ({ name: e.name, email: e.email })), [existing]);
  const preview = useMemo(() => previewImport(text, roster), [text, roster]);

  const readFile = (file: File) => {
    if (file.size > 1_000_000) return toast({ tone: "error", title: "File is too large", description: "Keep it under 1 MB, about 10,000 rows." });
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  };

  const run = async () => {
    if (preview.valid.length === 0) return;
    setBusy(true);
    try {
      const created = await api.importEmployees(
        companyId,
        preview.valid.map((r) => ({ name: r.name, email: r.email || undefined, role: r.role || undefined, amount: r.amount.replace(/^\$/, "") })),
      );
      onImported(created);
      setDone(created);
      toast({ tone: "success", title: `${created.length} ${created.length === 1 ? "person" : "people"} added`, description: "Send them their invite links to finish setup." });
    } catch (e) {
      toast({ tone: "error", title: "Import failed", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => downloadText("payslip-import-template.csv", IMPORT_TEMPLATE);
  const downloadLinks = () => {
    if (!done) return;
    const lines = ["name,email,role,amount_usd,invite_link", ...done.map((p) => [csv(p.name), p.email ?? "", csv(p.role ?? ""), formatUsd(p.amount, { sign: false }), p.inviteToken ? inviteUrl(p.inviteToken) : ""].join(","))];
    downloadText("payslip-invite-links.csv", lines.join("\n"));
  };

  if (done) {
    const allLinks = done.map((p) => `${p.name}: ${p.inviteToken ? inviteUrl(p.inviteToken) : ""}`).join("\n");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--radius-md)] border border-green/30 bg-green-soft p-3.5">
          <p className="text-[14px] font-medium text-green-ink">
            {done.length} {done.length === 1 ? "person" : "people"} added as invited
          </p>
          <p className="mt-0.5 text-[13px] text-ink-2">Each one needs to open their link, connect a wallet and register once. Then they can be paid.</p>
        </div>
        <ul className="max-h-64 divide-y divide-line overflow-auto rounded-[var(--radius-md)] border border-line">
          {done.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-ink">{p.name}</p>
                <p className="truncate text-[12px] text-ink-3">{p.email || p.role || "No email"}</p>
              </div>
              {p.inviteToken && <CopyButton value={inviteUrl(p.inviteToken)}>Copy link</CopyButton>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" leadingIcon={<Download size={14} />} onClick={downloadLinks}>
            Download links CSV
          </Button>
          <CopyButton value={allLinks} size="md">
            Copy all links
          </CopyButton>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed px-4 py-5 text-center transition-colors",
          dragging ? "border-ink bg-paper-sunken" : "border-line-strong",
        )}
      >
        <FileUp size={18} className="text-ink-3" />
        <p className="text-[13.5px] text-ink-2">
          {fileName ? (
            <>
              Loaded <span className="font-medium text-ink">{fileName}</span>
            </>
          ) : (
            "Drop a .csv here, or paste below"
          )}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
            Choose file
          </Button>
          <Button size="sm" variant="ghost" leadingIcon={<Download size={13} />} onClick={downloadTemplate}>
            Template
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <Textarea
        label="CSV"
        labelAside={preview.header ? `Header: ${preview.header.join(", ")}` : text.trim() ? "No header row detected, using name, email, role, amount" : undefined}
        placeholder={IMPORT_TEMPLATE}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFileName(null);
        }}
        rows={5}
        className="font-mono text-[12.5px]"
        spellCheck={false}
      />

      {preview.rows.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 hairline">
            <div className="flex items-center gap-2 text-[13px]">
              <Badge tone="green">{preview.valid.length} ready</Badge>
              {preview.invalid.length > 0 && <Badge tone="amber">{preview.invalid.length} skipped</Badge>}
            </div>
            <span className="text-[12.5px] text-ink-3">
              Adds <Amount value={preview.total} size="sm" className="text-ink-2" /> per batch
            </span>
          </div>
          <ul className="max-h-56 divide-y divide-line overflow-auto">
            {preview.rows.map((r) => (
              <PreviewRow key={r.line} row={r} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-3">{preview.invalid.length > 0 ? "Rows with problems are skipped. Fix them and paste again to include them." : "\u00a0"}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button leadingIcon={<Upload size={14} />} loading={busy} loadingLabel="Importing…" disabled={preview.valid.length === 0} onClick={run}>
            Import {preview.valid.length > 0 ? preview.valid.length : ""} {preview.valid.length === 1 ? "person" : "people"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ row }: { row: ImportRow }) {
  const bad = row.errors.length > 0;
  return (
    <li className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-3.5 py-2", bad && "bg-amber-soft/40")}>
      <span className="w-6 font-mono text-[11.5px] text-ink-4">{row.line}</span>
      <div className="min-w-0">
        <p className={cn("truncate text-[13.5px]", bad ? "text-ink-2" : "font-medium text-ink")}>{row.name || <span className="italic text-ink-4">no name</span>}</p>
        <p className="truncate text-[12px] text-ink-3">
          {bad ? (
            <span className="inline-flex items-center gap-1 text-amber">
              <AlertTriangle size={11} /> {row.errors.join(" · ")}
            </span>
          ) : (
            [row.email, row.role].filter(Boolean).join(" · ") || "No email or label"
          )}
        </p>
      </div>
      <span className={cn("font-mono tnum text-[13px]", bad ? "text-ink-4 line-through" : "text-ink")}>{row.amountBase !== null ? formatUsd(row.amountBase) : row.amount || "—"}</span>
    </li>
  );
}

function csv(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadText(name: string, body: string) {
  const blob = new Blob([body], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
