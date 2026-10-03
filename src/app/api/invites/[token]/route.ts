import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companies, employees } from "@/lib/db/schema";
import { ApiError, handle, json, requireSession } from "@/lib/api/server";

async function loadInvite(token: string) {
  const row = await db
    .select({ employee: employees, company: companies })
    .from(employees)
    .innerJoin(companies, eq(employees.companyId, companies.id))
    .where(eq(employees.inviteToken, token))
    .limit(1);
  const hit = row[0];
  if (!hit || hit.employee.status === "removed") throw new ApiError(404, "This invite link is no longer valid");
  return hit;
}

/** Public: what the invited person sees before connecting. */
export const GET = handle(async (_req, { params }) => {
  const { token } = await params;
  const { employee, company } = await loadInvite(token);
  return json({
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      status: employee.status,
      walletAddress: employee.walletAddress,
    },
    company: { name: company.name, mint: company.mint, auditorElgamalPubkey: company.auditorElgamalPubkey },
  });
});

const Accept = z.object({
  configuredSignature: z.string().min(32),
});

/** Binds the signed-in wallet to the invite after the confidential account is configured. */
export const POST = handle(async (req, { params }) => {
  const { token } = await params;
  const session = await requireSession();
  const { employee, company } = await loadInvite(token);
  const parsed = Accept.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "Invalid request");

  if (employee.walletAddress && employee.walletAddress !== session.address) {
    throw new ApiError(409, "This invite was already accepted by a different wallet");
  }

  // One wallet cannot be two active people at the same company.
  const clash = await db.query.employees.findFirst({
    where: and(eq(employees.companyId, company.id), eq(employees.walletAddress, session.address), eq(employees.status, "active")),
  });
  if (clash && clash.id !== employee.id) throw new ApiError(409, "This wallet is already set up at this company");

  await db
    .update(employees)
    .set({
      walletAddress: session.address,
      status: "active",
      configuredSignature: parsed.data.configuredSignature,
      activatedAt: new Date().toISOString(),
    })
    .where(eq(employees.id, employee.id));

  return json(await db.query.employees.findFirst({ where: eq(employees.id, employee.id) }));
});
