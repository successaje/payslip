import { sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * The database stores only what the chain cannot: names, emails, invite
 * tokens, intended amounts, and run bookkeeping. Nothing here is needed to
 * decrypt anything. Amounts are base-unit decimal strings (6 decimals).
 */

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerAddress: text("owner_address").notNull(),
    /** Token-2022 mint with the confidential extension. Null until created on-chain. */
    mint: text("mint"),
    /** Wallet that holds the auditor key. */
    auditorAddress: text("auditor_address").notNull(),
    /** Auditor ElGamal public key set in the mint config, base58. */
    auditorElgamalPubkey: text("auditor_elgamal_pubkey"),
    /** Signature of the mint-creation transaction. */
    mintSignature: text("mint_signature"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("companies_owner_idx").on(t.ownerAddress)],
);

export const employeeStatus = ["invited", "active", "removed"] as const;
export type EmployeeStatus = (typeof employeeStatus)[number];

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    role: text("role"),
    /** Monthly salary in base units. */
    amount: text("amount").notNull(),
    walletAddress: text("wallet_address"),
    inviteToken: text("invite_token").notNull(),
    status: text("status", { enum: employeeStatus }).notNull().default("invited"),
    /** Signature of the confidential-account configure transaction. */
    configuredSignature: text("configured_signature"),
    createdAt: text("created_at").notNull().default(now),
    activatedAt: text("activated_at"),
  },
  (t) => [
    uniqueIndex("employees_invite_idx").on(t.inviteToken),
    index("employees_company_idx").on(t.companyId),
    index("employees_wallet_idx").on(t.walletAddress),
  ],
);

export const runStatus = ["draft", "running", "completed", "partial", "failed"] as const;
export type RunStatus = (typeof runStatus)[number];

export const payrollRuns = sqliteTable(
  "payroll_runs",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    /** Human label, e.g. "October 2026". */
    period: text("period").notNull(),
    status: text("status", { enum: runStatus }).notNull().default("draft"),
    /** Sum of intended amounts, base units. */
    total: text("total").notNull(),
    createdAt: text("created_at").notNull().default(now),
    completedAt: text("completed_at"),
  },
  (t) => [index("runs_company_idx").on(t.companyId)],
);

export const paymentStatus = ["pending", "preparing", "signing", "submitted", "confirming", "paid", "failed"] as const;
export type PaymentStatus = (typeof paymentStatus)[number];

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id),
    /** Snapshot of the amount at run time, base units. */
    amount: text("amount").notNull(),
    status: text("status", { enum: paymentStatus }).notNull().default("pending"),
    /** Signature of the transaction carrying the confidential transfer. */
    signature: text("signature"),
    /** All signatures in the transfer plan, JSON array, for support and audit. */
    signatures: text("signatures"),
    error: text("error"),
    updatedAt: text("updated_at").notNull().default(now),
    paidAt: text("paid_at"),
  },
  (t) => [index("payments_run_idx").on(t.runId), index("payments_employee_idx").on(t.employeeId)],
);

export type Company = typeof companies.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type Payment = typeof payments.$inferSelect;
