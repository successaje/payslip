import { ed25519 } from "@noble/curves/ed25519.js";
import { getAddressCodec, type Address } from "@solana/kit";

/**
 * Sign-in with Solana. The wallet signs a human-readable statement that
 * binds the session to this origin and a server-issued nonce. The server
 * verifies the ed25519 signature against the account's public key.
 */

export interface SignInMessage {
  domain: string;
  address: string;
  nonce: string;
  issuedAt: string;
}

export const STATEMENT = "Sign in to Payslip. This signature does not cost anything and does not move funds.";

export function buildSignInMessage({ domain, address, nonce, issuedAt }: SignInMessage): string {
  return [
    `${domain} wants you to sign in with your Solana account:`,
    address,
    "",
    STATEMENT,
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export function parseSignInMessage(text: string): SignInMessage | null {
  const lines = text.split("\n");
  const head = /^(.+) wants you to sign in with your Solana account:$/.exec(lines[0] ?? "");
  const address = lines[1];
  const nonce = /^Nonce: (.+)$/.exec(lines[5] ?? "")?.[1];
  const issuedAt = /^Issued At: (.+)$/.exec(lines[6] ?? "")?.[1];
  if (!head || !address || !nonce || !issuedAt || lines[3] !== STATEMENT) return null;
  return { domain: head[1], address, nonce, issuedAt };
}

export function verifySignature(message: string, signature: Uint8Array, address: Address): boolean {
  const publicKey = getAddressCodec().encode(address) as Uint8Array;
  try {
    return ed25519.verify(signature, new TextEncoder().encode(message), publicKey);
  } catch {
    return false;
  }
}
