import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { getAddressDecoder } from "@solana/kit";
import { buildSignInMessage, parseSignInMessage, verifySignature } from "./siws";

describe("sign-in with Solana", () => {
  const secret = ed25519.utils.randomSecretKey();
  const pub = ed25519.getPublicKey(secret);
  const address = getAddressDecoder().decode(pub);
  const msg = { domain: "localhost:3200", address, nonce: "abc123", issuedAt: "2026-10-03T00:00:00.000Z" };

  it("round-trips the message format", () => {
    const text = buildSignInMessage(msg);
    expect(parseSignInMessage(text)).toEqual(msg);
  });

  it("verifies a valid signature and rejects a tampered one", () => {
    const text = buildSignInMessage(msg);
    const sig = ed25519.sign(new TextEncoder().encode(text), secret);
    expect(verifySignature(text, sig, address)).toBe(true);
    expect(verifySignature(text + "x", sig, address)).toBe(false);
  });

  it("rejects malformed messages", () => {
    expect(parseSignInMessage("hello")).toBeNull();
  });
});
