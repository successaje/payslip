import "server-only";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { companies, employees } from "@/lib/db/schema";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function handle(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message }, { status: e.status });
      console.error(e);
      return json({ error: "Unexpected server error" }, { status: 500 });
    }
  };
}

export async function requireSession() {
  const s = await getSession();
  if (!s) throw new ApiError(401, "Sign in first");
  return s;
}

/** Loads a company the signed-in address owns, or 404. */
export async function requireOwnedCompany(id: string) {
  const session = await requireSession();
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, id), eq(companies.ownerAddress, session.address)),
  });
  if (!company) throw new ApiError(404, "Company not found");
  return { session, company };
}

/** Loads a company the signed-in address owns or audits, or 404. */
export async function requireCompanyAccess(id: string) {
  const session = await requireSession();
  const company = await db.query.companies.findFirst({ where: eq(companies.id, id) });
  if (!company || (company.ownerAddress !== session.address && company.auditorAddress !== session.address)) {
    throw new ApiError(404, "Company not found");
  }
  return { session, company, role: company.ownerAddress === session.address ? ("owner" as const) : ("auditor" as const) };
}

/** Everything the app needs to route a signed-in wallet. */
export async function describeMe(address: string) {
  const owned = await db.query.companies.findMany({ where: eq(companies.ownerAddress, address) });
  const audits = await db
    .select({ id: companies.id, name: companies.name, mint: companies.mint, ownerAddress: companies.ownerAddress })
    .from(companies)
    .where(eq(companies.auditorAddress, address));
  const memberships = await db
    .select({
      employee: employees,
      company: { id: companies.id, name: companies.name, mint: companies.mint },
    })
    .from(employees)
    .innerJoin(companies, eq(employees.companyId, companies.id))
    .where(and(eq(employees.walletAddress, address), eq(employees.status, "active")));
  const requests = await db
    .select({ id: employees.id, name: employees.name, note: employees.note, company: { id: companies.id, name: companies.name } })
    .from(employees)
    .innerJoin(companies, eq(employees.companyId, companies.id))
    .where(and(eq(employees.walletAddress, address), eq(employees.status, "requested")));
  return { address, companies: owned, memberships, audits, requests };
}

export type Me = Awaited<ReturnType<typeof describeMe>>;

export function newId(): string {
  return crypto.randomUUID();
}

export function inviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
