import type { KeyPairSigner } from "@solana/kit";

/** 64-byte Solana CLI keypair format (secret || public) from a kit signer whose key is extractable. */
export async function exportKeyPairBytes(kp: KeyPairSigner): Promise<Uint8Array> {
  const priv = await crypto.subtle.exportKey("pkcs8", kp.keyPair.privateKey);
  const pub = await crypto.subtle.exportKey("raw", kp.keyPair.publicKey);
  const out = new Uint8Array(64);
  out.set(new Uint8Array(priv).slice(-32), 0);
  out.set(new Uint8Array(pub), 32);
  return out;
}
