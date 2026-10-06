import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companies } from "@/lib/db/schema";
import { ApiError, handle, inviteToken, json, requireOwnedCompany } from "@/lib/api/server";

const Body = z.object({
  enabled: z.boolean(),
  label: z.string().trim().max(80).optional().or(z.literal("")),
  /** Issue a new token, invalidating the old link. */
  rotate: z.boolean().optional(),
});

/** Enable, relabel, rotate or disable the workspace's public claim link. */
export const PATCH = handle(async (req, { params }) => {
  const { id } = await params;
  const { company } = await requireOwnedCompany(id);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "Invalid request");
  const d = parsed.data;

  const claimToken = !d.enabled ? null : d.rotate || !company.claimToken ? inviteToken() : company.claimToken;
  await db
    .update(companies)
    .set({ claimToken, ...(d.label !== undefined ? { claimLabel: d.label || null } : {}) })
    .where(eq(companies.id, id));
  return json(await db.query.companies.findFirst({ where: eq(companies.id, id) }));
});
