import { z } from "zod";
import { address as toAddress } from "@solana/kit";
import { db } from "@/lib/db/client";
import { companies } from "@/lib/db/schema";
import { ApiError, handle, json, newId, requireSession } from "@/lib/api/server";

const Body = z.object({
  name: z.string().trim().min(2, "Give the company a name").max(80),
  auditorAddress: z.string().trim(),
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");

  let auditor: string;
  try {
    auditor = toAddress(parsed.data.auditorAddress);
  } catch {
    throw new ApiError(400, "Auditor must be a valid Solana address");
  }

  const id = newId();
  await db.insert(companies).values({
    id,
    name: parsed.data.name,
    ownerAddress: session.address,
    auditorAddress: auditor,
  });
  const company = await db.query.companies.findFirst({ where: (c, { eq }) => eq(c.id, id) });
  return json(company, { status: 201 });
});
