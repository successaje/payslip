"use client";

/**
 * Browser-side confidential balance operations.
 *
 * Thin wrappers over `@softseco/confidential-transfers` that initialise the
 * WASM module first and narrow the inputs to what Payslip needs. Every
 * function takes the wallet signer as `owner`; proofs are generated locally
 * and the server never participates.
 */
import type { Address, MessagePartialSigner, Signature, TransactionSigner } from "@solana/kit";
import { DECIMALS } from "@/lib/domain/money";
import type { SolanaClient } from "./rpc";
import { initZk } from "./zk";

type Owner = TransactionSigner & MessagePartialSigner;

/**
 * The SDK pulls in the zk-sdk WASM module at evaluation time, so it must only
 * ever be loaded in the browser, after the WASM is initialised. Loading it
 * lazily keeps it out of server rendering entirely.
 */
let sdkPromise: Promise<typeof import("@softseco/confidential-transfers")> | null = null;
async function sdk() {
  await initZk();
  if (!sdkPromise) sdkPromise = import("@softseco/confidential-transfers");
  return sdkPromise;
}

export async function configureConfidentialAccount(client: SolanaClient, owner: Owner, mint: Address) {
  const { configureAccount, getElGamalPubkeyAddress } = await sdk();
  const r = await configureAccount({ ...client, payer: owner, owner, mint });
  return { token: r.token, signature: r.signature, elgamalPubkey: getElGamalPubkeyAddress(r.elgamalKeypair) };
}

export async function depositToConfidential(client: SolanaClient, owner: Owner, mint: Address, amount: bigint) {
  const { deposit } = await sdk();
  return deposit({ ...client, payer: owner, owner, mint, amount, decimals: DECIMALS });
}

export async function applyPending(client: SolanaClient, owner: Owner, mint: Address) {
  const { applyPendingBalance } = await sdk();
  return applyPendingBalance({ ...client, payer: owner, owner, mint });
}

export async function decryptAvailableBalance(client: SolanaClient, owner: Owner, mint: Address): Promise<bigint> {
  const { decryptBalance } = await sdk();
  return decryptBalance({ rpc: client.rpc, owner, mint });
}

export interface ConfidentialTransferResult {
  /** Signature of the transaction carrying the transfer instruction (the last one). */
  signature: Signature;
  signatures: Signature[];
  destinationToken: Address;
}

export async function confidentialTransfer(
  client: SolanaClient,
  owner: Owner,
  mint: Address,
  destinationOwner: Address,
  amount: bigint,
  auditorElgamalPubkey: Address | null,
): Promise<ConfidentialTransferResult> {
  const { transfer } = await sdk();
  const r = await transfer({
    ...client,
    payer: owner,
    owner,
    mint,
    destinationOwner,
    amount,
    auditorElgamalPubkey: auditorElgamalPubkey ?? undefined,
  });
  return { signature: r.signatures[r.signatures.length - 1], signatures: [...r.signatures], destinationToken: r.destinationToken };
}

export async function withdrawToPublic(client: SolanaClient, owner: Owner, mint: Address, amount: bigint) {
  const { withdraw } = await sdk();
  return withdraw({ ...client, payer: owner, owner, mint, amount, decimals: DECIMALS });
}

/** The auditor's ElGamal public key, derived from their wallet with one signature. */
export async function auditorPublicKey(auditor: MessagePartialSigner): Promise<Address> {
  const { getAuditorElgamalPubkey, deriveAuditorElgamalKeypair } = await sdk();
  return getAuditorElgamalPubkey(await deriveAuditorElgamalKeypair(auditor));
}

/** Recovers the amount of a confidential transfer as the mint's auditor. */
export async function auditTransferAmount(client: SolanaClient, auditor: MessagePartialSigner, signature: Signature): Promise<bigint> {
  const { deriveAuditorElgamalKeypair, decryptTransferAmountAsAuditor } = await sdk();
  const auditorKeypair = await deriveAuditorElgamalKeypair(auditor);
  return decryptTransferAmountAsAuditor({ rpc: client.rpc, signature, auditorKeypair });
}
