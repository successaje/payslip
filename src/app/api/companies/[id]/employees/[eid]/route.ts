import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import { ApiError, handle, inviteToken, json, requireOwnedCompany } from "@/lib/api/server";
import { parseUsd } from "@/lib/domain/money";

const Patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  role: z.string().trim().max(60).optional().or(z.literal("")),
  amount: z.string().trim().min(1).optional(),
  status: z.enum(["invited", "requested", "active", "removed"]).optional(),
  /** Issue a fresh invite link (invalidates the old one). */
  rotateInvite: z.boolean().optional(),
});

export const PATCH = handle(async (req, { params }) => {
  const { id, eid } = await params;
  await requireOwnedCompany(id);
  const existing = await db.query.employees.findFirst({ where: and(eq(employees.id, eid), eq(employees.companyId, id)) });
  if (!existing) throw new ApiError(404, "Person not found");

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  const d = parsed.data;

  const update: Partial<typeof employees.$inferInsert> = {};
  if (d.name !== undefined) update.name = d.name;
  if (d.email !== undefined) update.email = d.email || null;
  if (d.role !== undefined) update.role = d.role || null;
  if (d.amount !== undefined) {
    try {
      const a = parseUsd(d.amount);
      if (a <= 0n) throw new Error("Amount must be more than zero");
      update.amount = a.toString();
    } catch (e) {
      throw new ApiError(400, e instanceof Error ? e.message : "Invalid amount");
    }
  }
  if (d.status) {
    if (d.status === "active" && !existing.walletAddress) throw new ApiError(400, "This person has not connected a wallet yet");
    if (d.status === "active" && existing.status === "requested") {
      const amount = BigInt(update.amount ?? existing.amount);
      if (amount <= 0n) throw new ApiError(400, "Set an amount before approving");
      update.activatedAt = new Date().toISOString();
    }
    update.status = d.status;
  }
  if (d.rotateInvite) update.inviteToken = inviteToken();

  await db.update(employees).set(update).where(eq(employees.id, eid));
  return json(await db.query.employees.findFirst({ where: eq(employees.id, eid) }));
});
