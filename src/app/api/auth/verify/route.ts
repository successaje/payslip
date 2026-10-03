import { z } from "zod";
import { address as toAddress } from "@solana/kit";
import { consumeNonce, createSession } from "@/lib/auth/session";
import { parseSignInMessage, verifySignature } from "@/lib/auth/siws";
import { APP_URL } from "@/lib/solana/config";
import { getBase64Codec } from "@solana/kit";

const Body = z.object({
  message: z.string().min(1).max(2000),
  signature: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const { message, signature } = parsed.data;
  const fields = parseSignInMessage(message);
  if (!fields) return Response.json({ error: "Malformed sign-in message" }, { status: 400 });

  const expectedDomain = new URL(APP_URL).host;
  if (fields.domain !== expectedDomain) {
    return Response.json({ error: "Sign-in message is for a different site" }, { status: 400 });
  }

  const nonce = await consumeNonce();
  if (!nonce || nonce !== fields.nonce) {
    return Response.json({ error: "Sign-in expired. Please try again." }, { status: 400 });
  }

  const issued = Date.parse(fields.issuedAt);
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 10 * 60 * 1000) {
    return Response.json({ error: "Sign-in message is stale" }, { status: 400 });
  }

  let addr;
  try {
    addr = toAddress(fields.address);
  } catch {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  const sigBytes = getBase64Codec().encode(signature) as Uint8Array;
  if (!verifySignature(message, sigBytes, addr)) {
    return Response.json({ error: "Signature did not verify" }, { status: 401 });
  }

  await createSession(addr);
  return Response.json({ address: addr });
}
