import { issueNonce } from "@/lib/auth/session";

export async function POST() {
  const nonce = await issueNonce();
  return Response.json({ nonce });
}
