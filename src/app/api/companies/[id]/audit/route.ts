import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees, payments, payrollRuns } from "@/lib/db/schema";
import { handle, json, requireCompanyAccess } from "@/lib/api/server";

/**
 * Every paid transfer for a company, for the owner or the auditor. The
 * amounts here are what the employer recorded; the auditor decrypts the real
 * amounts from the signatures in the browser and compares.
 */
export const GET = handle(async (_req, { params }) => {
  const { id } = await params;
  const { company } = await requireCompanyAccess(id);
  const rows = await db
    .select({
      paymentId: payments.id,
      period: payrollRuns.period,
      employeeName: employees.name,
      employeeWallet: employees.walletAddress,
      recordedAmount: payments.amount,
      signature: payments.signature,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .innerJoin(payrollRuns, eq(payments.runId, payrollRuns.id))
    .innerJoin(employees, eq(payments.employeeId, employees.id))
    .where(and(eq(payrollRuns.companyId, id), eq(payments.status, "paid")))
    .orderBy(payments.paidAt);
  return json({
    company: {
      id: company.id,
      name: company.name,
      mint: company.mint,
      auditorAddress: company.auditorAddress,
      auditorElgamalPubkey: company.auditorElgamalPubkey,
    },
    rows: rows.filter((r) => r.signature).reverse(),
  });
});
