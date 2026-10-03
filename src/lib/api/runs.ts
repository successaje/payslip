import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees, payments, payrollRuns } from "@/lib/db/schema";
import { ApiError } from "./server";

/** A run with its payments, each joined to the person it pays. */
export async function loadRun(companyId: string, runId: string) {
  const run = await db.query.payrollRuns.findFirst({ where: and(eq(payrollRuns.id, runId), eq(payrollRuns.companyId, companyId)) });
  if (!run) throw new ApiError(404, "Run not found");
  const rows = await db
    .select({
      payment: payments,
      employee: { id: employees.id, name: employees.name, walletAddress: employees.walletAddress, role: employees.role },
    })
    .from(payments)
    .innerJoin(employees, eq(payments.employeeId, employees.id))
    .where(eq(payments.runId, runId))
    .orderBy(employees.createdAt);
  return { run, payments: rows.map((r) => ({ ...r.payment, employee: r.employee })) };
}
