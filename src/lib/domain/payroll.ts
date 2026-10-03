import type { PaymentStatus, RunStatus } from "@/lib/db/schema";

/**
 * Pure payroll-run rules. Kept free of the database and the chain so they
 * can be tested and reused by the API and the browser runner.
 */

export const TERMINAL: ReadonlySet<PaymentStatus> = new Set(["paid", "failed"]);
export const IN_FLIGHT: ReadonlySet<PaymentStatus> = new Set(["preparing", "signing", "submitted", "confirming"]);

/** Derives the run status from its payments. */
export function deriveRunStatus(statuses: readonly PaymentStatus[]): RunStatus {
  if (statuses.length === 0) return "draft";
  const paid = statuses.filter((s) => s === "paid").length;
  const failed = statuses.filter((s) => s === "failed").length;
  const inFlight = statuses.some((s) => IN_FLIGHT.has(s));
  if (inFlight) return "running";
  if (paid === statuses.length) return "completed";
  if (paid > 0 && paid + failed === statuses.length) return "partial";
  if (failed === statuses.length) return "failed";
  if (paid > 0 || failed > 0) return "running";
  return "draft";
}

/** Payments the runner should attempt in this pass, in order. */
export function paymentsToAttempt<T extends { status: PaymentStatus }>(payments: readonly T[]): T[] {
  return payments.filter((p) => p.status === "pending" || p.status === "failed");
}

/** Whether a stored status may move to the next one. Guards the PATCH endpoint. */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === "paid") return false;
  if (to === "pending") return from === "failed";
  if (to === "failed") return true;
  const order: PaymentStatus[] = ["pending", "preparing", "signing", "submitted", "confirming", "paid"];
  const fromIdx = order.indexOf(from === "failed" ? "pending" : from);
  const toIdx = order.indexOf(to);
  return toIdx > fromIdx;
}
