import { parseUsd } from "./money";

/**
 * CSV import for the roster. Pure: parsing and validation only, so it can be
 * tested without a browser and previewed before anything is written.
 *
 * Accepted columns (case-insensitive, any order): name, email, role (also
 * "label", "title", "note"), amount (also "pay", "salary", "usd", "per batch").
 * A header row is optional; without one, columns are taken in that order.
 */
export interface ImportRow {
  line: number;
  name: string;
  email: string;
  role: string;
  amount: string;
  /** Base units when the row is valid. */
  amountBase: bigint | null;
  errors: string[];
  /** Set when a person with the same email or name is already on the roster. */
  duplicateOf?: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  valid: ImportRow[];
  invalid: ImportRow[];
  total: bigint;
  /** Header fields recognised, or null when the first line was treated as data. */
  header: string[] | null;
}

const ALIASES: Record<"name" | "email" | "role" | "amount", string[]> = {
  name: ["name", "full name", "person", "recipient", "employee", "contributor"],
  email: ["email", "e-mail", "mail"],
  role: ["role", "label", "title", "note", "description", "what for"],
  amount: ["amount", "pay", "salary", "usd", "usdc", "per batch", "monthly", "rate", "total"],
};

/** RFC 4180-ish: quoted fields, doubled quotes, commas or semicolons or tabs. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(src);
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c.length > 0));
}

function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of first) if (ch in counts) counts[ch as keyof typeof counts]++;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as string;
}

function matchHeader(cells: string[]): Partial<Record<keyof typeof ALIASES, number>> | null {
  const map: Partial<Record<keyof typeof ALIASES, number>> = {};
  let hits = 0;
  cells.forEach((cell, i) => {
    const key = normalize(cell);
    for (const [field, aliases] of Object.entries(ALIASES) as [keyof typeof ALIASES, string[]][]) {
      if (map[field] === undefined && aliases.some((a) => normalize(a) === key)) {
        map[field] = i;
        hits++;
      }
    }
  });
  return hits >= 2 && map.name !== undefined ? map : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalize = (v: string) => v.toLowerCase().replace(/[_\-\s]+/g, " ").trim();

export function previewImport(text: string, existing: { name: string; email: string | null }[] = []): ImportPreview {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], valid: [], invalid: [], total: 0n, header: null };

  const headerMap = matchHeader(table[0]);
  const body = headerMap ? table.slice(1) : table;
  const col = headerMap ?? { name: 0, email: 1, role: 2, amount: 3 };
  // Without a header, a three-column file is name, role, amount when the 2nd column is not an email.
  const threeCol = !headerMap && body.every((r) => r.length <= 3) && !body.some((r) => EMAIL.test(r[1] ?? ""));
  const pick = (r: string[], key: keyof typeof ALIASES) => {
    if (threeCol) return key === "name" ? r[0] : key === "role" ? r[1] : key === "amount" ? r[2] : "";
    const i = col[key];
    return i === undefined ? "" : (r[i] ?? "");
  };

  const byEmail = new Map(existing.filter((e) => e.email).map((e) => [e.email!.toLowerCase(), e.name]));
  const byName = new Map(existing.map((e) => [e.name.toLowerCase(), e.name]));
  const seen = new Set<string>();

  const rows: ImportRow[] = body.map((r, idx) => {
    const line = idx + (headerMap ? 2 : 1);
    const name = (pick(r, "name") ?? "").trim();
    const email = (pick(r, "email") ?? "").trim();
    const role = (pick(r, "role") ?? "").trim();
    const amount = (pick(r, "amount") ?? "").trim();
    const errors: string[] = [];
    let amountBase: bigint | null = null;

    if (!name) errors.push("Missing name");
    else if (name.length > 80) errors.push("Name is too long");
    if (email && !EMAIL.test(email)) errors.push("Invalid email");
    if (role.length > 60) errors.push("Label is too long");
    if (!amount) errors.push("Missing amount");
    else {
      try {
        amountBase = parseUsd(amount.replace(/^\$/, ""));
        if (amountBase <= 0n) errors.push("Amount must be above zero");
      } catch {
        errors.push("Amount is not a number");
      }
    }

    const key = (email || name).toLowerCase();
    if (key && seen.has(key)) errors.push("Repeated in this file");
    seen.add(key);
    const duplicateOf = (email && byEmail.get(email.toLowerCase())) || byName.get(name.toLowerCase()) || undefined;
    if (duplicateOf) errors.push(`Already on the roster as ${duplicateOf}`);

    return { line, name, email, role, amount, amountBase: errors.length ? null : amountBase, errors, duplicateOf };
  });

  const valid = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);
  const total = valid.reduce((s, r) => s + (r.amountBase ?? 0n), 0n);
  return { rows, valid, invalid, total, header: headerMap ? table[0] : null };
}

export const IMPORT_TEMPLATE = ["name,email,role,amount", "Ada Okafor,ada@example.com,Designer,2350.00", "Tunde Bello,,Bounty #42,750"].join("\n");
