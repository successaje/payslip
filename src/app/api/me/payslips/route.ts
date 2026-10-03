import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companies, employees, payments, payrollRuns } from "@/lib/db/schema";
import { handle, json, requireSession } from "@/lib/api/server";

/**
 * Everything the signed-in wallet has been paid, grouped by company. The
 * amount here is what the employer entered; the on-chain balance the
 * employee decrypts locally is the source of truth.
 */
export const GET = handle(async () => {
  const session = await requireSession();
  const memberships = await db
    .select({ employee: employees, company: { id: companies.id, name: companies.name, mint: companies.mint } })
    .from(employees)
    .innerJoin(companies, eq(employees.companyId, companies.id))
    .where(and(eq(employees.walletAddress, session.address), inArray(employees.status, ["active", "removed"])));

  const result = [];
  for (const m of memberships) {
    const rows = await db
      .select({ payment: payments, period: payrollRuns.period })
      .from(payments)
      .innerJoin(payrollRuns, eq(payments.runId, payrollRuns.id))
      .where(and(eq(payments.employeeId, m.employee.id), eq(payments.status, "paid")))
      .orderBy(payments.paidAt);
    result.push({
      company: m.company,
      employee: m.employee,
      payments: rows.map((r) => ({ ...r.payment, period: r.period })).reverse(),
    });
  }
  return json(result);
});
