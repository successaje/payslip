import { z } from "zod";
import { eq } from "drizzle-orm";
import { address as toAddress } from "@solana/kit";
import { db } from "@/lib/db/client";
import { companies } from "@/lib/db/schema";
import { ApiError, handle, json, requireOwnedCompany } from "@/lib/api/server";

export const GET = handle(async (_req, { params }) => {
  const { id } = await params;
  const { company } = await requireOwnedCompany(id);
  return json(company);
});

const Patch = z.object({
  mint: z.string().optional(),
  auditorElgamalPubkey: z.string().optional(),
  mintSignature: z.string().optional(),
  name: z.string().trim().min(2).max(80).optional(),
});

/** Records on-chain facts after the client has created the mint. */
export const PATCH = handle(async (req, { params }) => {
  const { id } = await params;
  const { company } = await requireOwnedCompany(id);
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "Invalid request");
  const data = parsed.data;

  if (data.mint) {
    if (company.mint && company.mint !== data.mint) throw new ApiError(409, "This company already has a payroll token");
    try {
      toAddress(data.mint);
      if (data.auditorElgamalPubkey) toAddress(data.auditorElgamalPubkey);
    } catch {
      throw new ApiError(400, "Invalid address");
    }
  }

  await db
    .update(companies)
    .set({
      ...(data.name ? { name: data.name } : {}),
      ...(data.mint ? { mint: data.mint, mintSignature: data.mintSignature ?? null } : {}),
      ...(data.auditorElgamalPubkey ? { auditorElgamalPubkey: data.auditorElgamalPubkey } : {}),
    })
    .where(eq(companies.id, id));

  return json(await db.query.companies.findFirst({ where: eq(companies.id, id) }));
});
