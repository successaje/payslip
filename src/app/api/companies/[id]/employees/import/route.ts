import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import { ApiError, handle, inviteToken, json, newId, requireOwnedCompany } from "@/lib/api/server";
import { parseUsd } from "@/lib/domain/money";

const Row = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  role: z.string().trim().max(60).optional().or(z.literal("")),
  amount: z.string().trim().min(1),
});
const Body = z.object({ rows: z.array(Row).min(1).max(500) });

/**
 * Bulk-create invited people from a validated CSV preview. All rows are
 * inserted together; one bad row fails the whole request so the roster never
 * ends up half-imported.
 */
export const POST = handle(async (req, { params }) => {
  const { id } = await params;
  await requireOwnedCompany(id);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");

  const values = parsed.data.rows.map((r, i) => {
    let amount: bigint;
    try {
      amount = parseUsd(r.amount);
    } catch (e) {
      throw new ApiError(400, `Row ${i + 1}: ${e instanceof Error ? e.message : "invalid amount"}`);
    }
    if (amount <= 0n) throw new ApiError(400, `Row ${i + 1}: amount must be more than zero`);
    return {
      id: newId(),
      companyId: id,
      name: r.name,
      email: r.email || null,
      role: r.role || null,
      amount: amount.toString(),
      inviteToken: inviteToken(),
    };
  });

  await db.insert(employees).values(values);
  const rows = await db.query.employees.findMany({ where: inArray(employees.id, values.map((v) => v.id)) });
  const order = new Map(values.map((v, i) => [v.id, i]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return json(rows, { status: 201 });
});
