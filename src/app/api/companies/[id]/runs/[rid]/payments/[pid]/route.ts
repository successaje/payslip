import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { paymentStatus, payments, payrollRuns } from "@/lib/db/schema";
import { ApiError, handle, json, requireOwnedCompany } from "@/lib/api/server";
import { canTransition, deriveRunStatus } from "@/lib/domain/payroll";

const Patch = z.object({
  status: z.enum(paymentStatus),
  signature: z.string().optional(),
  signatures: z.string().optional(),
  error: z.string().max(500).nullable().optional(),
});

/**
 * The browser runner reports each payment's progress here. Transitions are
 * validated so a stale client cannot move a paid payment backwards, and the
 * run's own status is re-derived after every change.
 */
export const PATCH = handle(async (req, { params }) => {
  const { id, rid, pid } = await params;
  await requireOwnedCompany(id);
  const run = await db.query.payrollRuns.findFirst({ where: and(eq(payrollRuns.id, rid), eq(payrollRuns.companyId, id)) });
  if (!run) throw new ApiError(404, "Run not found");
  const payment = await db.query.payments.findFirst({ where: and(eq(payments.id, pid), eq(payments.runId, rid)) });
  if (!payment) throw new ApiError(404, "Payment not found");

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "Invalid request");
  const d = parsed.data;

  if (!canTransition(payment.status, d.status)) {
    throw new ApiError(409, `Cannot move a payment from ${payment.status} to ${d.status}`);
  }
  if (d.status === "paid" && !d.signature) throw new ApiError(400, "A paid payment needs its signature");

  const now = new Date().toISOString();
  await db
    .update(payments)
    .set({
      status: d.status,
      ...(d.signature ? { signature: d.signature } : {}),
      ...(d.signatures ? { signatures: d.signatures } : {}),
      error: d.status === "failed" ? (d.error ?? "Unknown error") : null,
      updatedAt: now,
      ...(d.status === "paid" ? { paidAt: now } : {}),
    })
    .where(eq(payments.id, pid));

  const all = await db.query.payments.findMany({ where: eq(payments.runId, rid) });
  const status = deriveRunStatus(all.map((p) => p.status));
  await db
    .update(payrollRuns)
    .set({ status, completedAt: status === "completed" || status === "partial" || status === "failed" ? now : null })
    .where(eq(payrollRuns.id, rid));

  return json(await db.query.payments.findFirst({ where: eq(payments.id, pid) }));
});
