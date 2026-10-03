import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import { ApiError, handle, inviteToken, json, newId, requireOwnedCompany } from "@/lib/api/server";
import { parseUsd } from "@/lib/domain/money";

export const GET = handle(async (_req, { params }) => {
  const { id } = await params;
  await requireOwnedCompany(id);
  const rows = await db.query.employees.findMany({
    where: and(eq(employees.companyId, id), ne(employees.status, "removed")),
    orderBy: (e, { asc }) => [asc(e.createdAt)],
  });
  return json(rows);
});

const Body = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80),
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
  role: z.string().trim().max(60).optional().or(z.literal("")),
  /** Dollar string as typed, e.g. "2,350.00". Stored as base units. */
  amount: z.string().trim().min(1, "Enter a monthly amount"),
});

export const POST = handle(async (req, { params }) => {
  const { id } = await params;
  await requireOwnedCompany(id);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");

  let amount: bigint;
  try {
    amount = parseUsd(parsed.data.amount);
  } catch (e) {
    throw new ApiError(400, e instanceof Error ? e.message : "Invalid amount");
  }
  if (amount <= 0n) throw new ApiError(400, "Amount must be more than zero");

  const employeeId = newId();
  await db.insert(employees).values({
    id: employeeId,
    companyId: id,
    name: parsed.data.name,
    email: parsed.data.email || null,
    role: parsed.data.role || null,
    amount: amount.toString(),
    inviteToken: inviteToken(),
  });
  const row = await db.query.employees.findFirst({ where: eq(employees.id, employeeId) });
  return json(row, { status: 201 });
});
