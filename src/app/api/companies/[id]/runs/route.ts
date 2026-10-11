import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees, payments, payrollRuns } from "@/lib/db/schema";
import { ApiError, handle, json, newId, requireOwnedCompany } from "@/lib/api/server";
import { sum } from "@/lib/domain/money";

export const GET = handle(async (_req, { params }) => {
  const { id } = await params;
  await requireOwnedCompany(id);
  const runs = await db.query.payrollRuns.findMany({
    where: eq(payrollRuns.companyId, id),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
  return json(runs);
});

const Body = z.object({
  period: z.string().trim().min(1).max(40),
  employeeIds: z.array(z.string()).min(1, "Pick at least one person"),
});

/** Creates a run with a payment per employee, snapshotting today's amounts. */
export const POST = handle(async (req, { params }) => {
  const { id } = await params;
  const { company } = await requireOwnedCompany(id);
  if (!company.mint) throw new ApiError(400, "Finish workspace setup before sending a batch");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");

  const people = await db.query.employees.findMany({
    where: and(eq(employees.companyId, id), inArray(employees.id, parsed.data.employeeIds), eq(employees.status, "active")),
  });
  if (people.length === 0) throw new ApiError(400, "None of the selected people are set up to be paid yet");

  const open = await db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.companyId, id), inArray(payrollRuns.status, ["draft", "running"])),
  });
  if (open) throw new ApiError(409, "Finish or resume the current run before starting another");

  const runId = newId();
  const total = sum(people.map((p) => BigInt(p.amount)));
  await db.insert(payrollRuns).values({ id: runId, companyId: id, period: parsed.data.period, total: total.toString() });
  await db.insert(payments).values(
    people.map((p) => ({ id: newId(), runId, employeeId: p.id, amount: p.amount })),
  );

  const run = await db.query.payrollRuns.findFirst({ where: eq(payrollRuns.id, runId) });
  const rows = await db.query.payments.findMany({ where: eq(payments.runId, runId) });
  return json({ run, payments: rows }, { status: 201 });
});
