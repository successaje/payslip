import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companies, employees } from "@/lib/db/schema";
import { ApiError, handle, inviteToken, json, newId, requireSession } from "@/lib/api/server";

async function loadByClaim(token: string) {
  const company = await db.query.companies.findFirst({ where: eq(companies.claimToken, token) });
  if (!company) throw new ApiError(404, "This link is not active");
  return company;
}

/** Public: what the link is for. */
export const GET = handle(async (_req, { params }) => {
  const { token } = await params;
  const c = await loadByClaim(token);
  return json({ company: { name: c.name, mint: c.mint, claimLabel: c.claimLabel } });
});

const Body = z.object({
  name: z.string().trim().min(1, "Tell them who you are").max(80),
  note: z.string().trim().max(200).optional().or(z.literal("")),
  configuredSignature: z.string().min(32),
});

/**
 * A wallet registers itself as a recipient. It lands in the payer's
 * "Requests" list with no amount until approved.
 */
export const POST = handle(async (req, { params }) => {
  const { token } = await params;
  const session = await requireSession();
  const company = await loadByClaim(token);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");

  const existing = await db.query.employees.findFirst({
    where: and(eq(employees.companyId, company.id), eq(employees.walletAddress, session.address)),
  });
  if (existing && existing.status !== "removed") {
    return json({ employee: existing, alreadyRegistered: true });
  }

  const id = newId();
  await db.insert(employees).values({
    id,
    companyId: company.id,
    name: parsed.data.name,
    note: parsed.data.note || null,
    amount: "0",
    walletAddress: session.address,
    inviteToken: inviteToken(),
    status: "requested",
    configuredSignature: parsed.data.configuredSignature,
  });
  const employee = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  return json({ employee, alreadyRegistered: false }, { status: 201 });
});
