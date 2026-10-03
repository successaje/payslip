import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "payslip.session";
const NONCE_COOKIE = "payslip.nonce";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const NONCE_TTL_SECONDS = 60 * 5;

export interface Session {
  address: string;
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is not set. Generate one with: openssl rand -base64 32");
  }
  return new TextEncoder().encode(s);
}

async function sign(payload: Record<string, unknown>, ttlSeconds: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret());
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function issueNonce(): Promise<string> {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const token = await sign({ nonce }, NONCE_TTL_SECONDS);
  (await cookies()).set(NONCE_COOKIE, token, { ...cookieOptions, maxAge: NONCE_TTL_SECONDS });
  return nonce;
}

/** Reads and clears the pending nonce. Returns null if absent or expired. */
export async function consumeNonce(): Promise<string | null> {
  const store = await cookies();
  const payload = await verify<{ nonce: string }>(store.get(NONCE_COOKIE)?.value);
  store.delete(NONCE_COOKIE);
  return payload?.nonce ?? null;
}

export async function createSession(address: string): Promise<void> {
  const token = await sign({ address }, SESSION_TTL_SECONDS);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_SECONDS });
}

export async function getSession(): Promise<Session | null> {
  const payload = await verify<{ address: string }>((await cookies()).get(SESSION_COOKIE)?.value);
  return payload?.address ? { address: payload.address } : null;
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
