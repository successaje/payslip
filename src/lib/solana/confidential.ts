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
import {
  applyPendingBalance as sdkApply,
  configureAccount as sdkConfigure,
  decryptBalance as sdkDecrypt,
  deposit as sdkDeposit,
  transfer as sdkTransfer,
  withdraw as sdkWithdraw,
  deriveAuditorElgamalKeypair,
  getAuditorElgamalPubkey,
  decryptTransferAmountAsAuditor,
  getElGamalPubkeyAddress,
} from "@softseco/confidential-transfers";
import { DECIMALS } from "@/lib/domain/money";
import type { SolanaClient } from "./rpc";
import { initZk } from "./zk";

type Owner = TransactionSigner & MessagePartialSigner;

export async function configureConfidentialAccount(client: SolanaClient, owner: Owner, mint: Address) {
  await initZk();
  const r = await sdkConfigure({ ...client, payer: owner, owner, mint });
  return { token: r.token, signature: r.signature, elgamalPubkey: getElGamalPubkeyAddress(r.elgamalKeypair) };
}

export async function depositToConfidential(client: SolanaClient, owner: Owner, mint: Address, amount: bigint) {
  await initZk();
  return sdkDeposit({ ...client, payer: owner, owner, mint, amount, decimals: DECIMALS });
}

export async function applyPending(client: SolanaClient, owner: Owner, mint: Address) {
  await initZk();
  return sdkApply({ ...client, payer: owner, owner, mint });
}

export async function decryptAvailableBalance(client: SolanaClient, owner: Owner, mint: Address): Promise<bigint> {
  await initZk();
  return sdkDecrypt({ rpc: client.rpc, owner, mint });
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
  await initZk();
  const r = await sdkTransfer({
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
  await initZk();
  return sdkWithdraw({ ...client, payer: owner, owner, mint, amount, decimals: DECIMALS });
}

/** The auditor's ElGamal public key, derived from their wallet with one signature. */
export async function auditorPublicKey(auditor: MessagePartialSigner): Promise<Address> {
  await initZk();
  return getAuditorElgamalPubkey(await deriveAuditorElgamalKeypair(auditor));
}

/** Recovers the amount of a confidential transfer as the mint's auditor. */
export async function auditTransferAmount(client: SolanaClient, auditor: MessagePartialSigner, signature: Signature): Promise<bigint> {
  await initZk();
  const auditorKeypair = await deriveAuditorElgamalKeypair(auditor);
  return decryptTransferAmountAsAuditor({ rpc: client.rpc, signature, auditorKeypair });
}
