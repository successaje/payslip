"use client";

/**
 * Confidential transfer in a single Transaction V1.
 *
 * The standard client sends five transactions per transfer: three to create
 * proof-context accounts, one to transfer, one to close them. Transaction V1
 * (mainnet since 15 September 2026) raises the size limit to 4,096 bytes, so
 * the three proofs can be verified inline, immediately before the transfer
 * instruction, in one atomic transaction. Measured on devnet: ~2.4 KB,
 * ~240k compute units, confirmed in under a second.
 *
 * Proofs are generated here, in the browser, from keys derived with one
 * wallet signature. The server never participates.
 */
import {
  address as toAddress,
  appendTransactionMessageInstructions,
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
  createTransactionMessage,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  isSome,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  signTransactionMessageWithSigners,
  type Address,
  type MessagePartialSigner,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import { TOKEN_2022_PROGRAM_ADDRESS, fetchToken, findAssociatedTokenPda, getConfidentialTransferInstruction } from "@solana-program/token-2022";
import {
  verifyBatchedGroupedCiphertext3HandlesValidity,
  verifyBatchedRangeProofU128,
  verifyCiphertextCommitmentEquality,
} from "@solana-program/zk-elgamal-proof";
import { ristretto255 } from "@noble/curves/ed25519.js";
import type { SolanaClient } from "./rpc";
import { initZk } from "./zk";

type Owner = TransactionSigner & MessagePartialSigner;

const LO_BITS = 16n;
const SYSVAR_INSTRUCTIONS = toAddress("Sysvar1nstructions1111111111111111111111111");
const MAX_AMOUNT = (1n << 48n) - 1n;

type RPoint = { add(p: RPoint): RPoint; subtract(p: RPoint): RPoint; multiply(n: bigint): RPoint; toBytes(): Uint8Array };
const Point = ristretto255.Point as unknown as { fromBytes(b: Uint8Array): RPoint };

function pts(c: Uint8Array) {
  return { c: Point.fromBytes(Uint8Array.from(c.slice(0, 32))), h: Point.fromBytes(Uint8Array.from(c.slice(32, 64))) };
}
function toCt(c: RPoint, h: RPoint) {
  const out = new Uint8Array(64);
  out.set(c.toBytes(), 0);
  out.set(h.toBytes(), 32);
  return out;
}
/** Pull one (commitment, handle) pair out of a 3-handle grouped ciphertext. */
function extract(grouped: Uint8Array, handle: number) {
  const out = new Uint8Array(64);
  out.set(grouped.slice(0, 32), 0);
  out.set(grouped.slice(32 + handle * 32, 64 + handle * 32), 32);
  return out;
}
/** left − (lo + hi·2^16), homomorphically. */
function subtractLoHi(left: Uint8Array, lo: Uint8Array, hi: Uint8Array) {
  const scale = 1n << LO_BITS;
  const L = pts(left), l = pts(lo), h = pts(hi);
  return toCt(L.c.subtract(l.c.add(h.c.multiply(scale))), L.h.subtract(l.h.add(h.h.multiply(scale))));
}

export interface V1TransferResult {
  signature: Signature;
  /** Serialized size of the transaction in bytes. */
  bytes: number;
}

export async function confidentialTransferV1(
  client: SolanaClient,
  owner: Owner,
  mint: Address,
  destinationOwner: Address,
  amount: bigint,
  auditorElgamalPubkey: Address | null,
): Promise<V1TransferResult> {
  if (amount <= 0n || amount > MAX_AMOUNT) throw new Error("Amount out of range for a confidential transfer");
  await initZk();
  const zk = await import("@solana/zk-sdk/web");
  const { deriveConfidentialKeys } = await import("@softseco/confidential-transfers");

  const [source] = await findAssociatedTokenPda({ owner: owner.address, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  const [dest] = await findAssociatedTokenPda({ owner: destinationOwner, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  const { elgamalKeypair, aesKey } = await deriveConfidentialKeys({ signer: owner });

  const [{ data: s }, { data: d }] = await Promise.all([fetchToken(client.rpc, source), fetchToken(client.rpc, dest)]);
  const ext = (t: typeof s) => {
    if (!isSome(t.extensions)) throw new Error("Account is not set up for private balances");
    const e = t.extensions.value.find((x) => x.__kind === "ConfidentialTransferAccount");
    if (!e || e.__kind !== "ConfidentialTransferAccount") throw new Error("Account is not set up for private balances");
    return e;
  };
  const sExt = ext(s);
  const dExt = ext(d);

  const enc = getAddressEncoder();
  const srcPub = elgamalKeypair.pubkey();
  const dstPub = zk.ElGamalPubkey.fromBytes(enc.encode(dExt.elgamalPubkey) as Uint8Array);
  const auditor = auditorElgamalPubkey
    ? zk.ElGamalPubkey.fromBytes(enc.encode(auditorElgamalPubkey) as Uint8Array)
    : zk.ElGamalPubkey.fromBytes(new Uint8Array(32));

  const lo = amount & ((1n << LO_BITS) - 1n);
  const hi = amount >> LO_BITS;
  const oLo = new zk.PedersenOpening();
  const oHi = new zk.PedersenOpening();
  const gLo = zk.GroupedElGamalCiphertext3Handles.encryptWith(srcPub, dstPub, auditor, lo, oLo);
  const gHi = zk.GroupedElGamalCiphertext3Handles.encryptWith(srcPub, dstPub, auditor, hi, oHi);
  const gLoB = new Uint8Array(gLo.toBytes());
  const gHiB = new Uint8Array(gHi.toBytes());

  const currentCt = zk.AeCiphertext.fromBytes(new Uint8Array(sExt.decryptableAvailableBalance));
  if (!currentCt) throw new Error("Could not read the current private balance");
  const current = aesKey.decrypt(currentCt);
  const newBalance = current - amount;
  if (newBalance < 0n) throw new Error("Not enough private balance for this payout");

  const nbOpen = new zk.PedersenOpening();
  const nbCommit = zk.PedersenCommitment.from(newBalance, nbOpen);
  const nbCt = zk.ElGamalCiphertext.fromBytes(subtractLoHi(new Uint8Array(sExt.availableBalance), extract(gLoB, 0), extract(gHiB, 0)));
  if (!nbCt) throw new Error("Could not derive the new balance ciphertext");

  const equality = new zk.CiphertextCommitmentEqualityProofData(elgamalKeypair, nbCt, nbCommit, nbOpen, newBalance);
  const validity = new zk.BatchedGroupedCiphertext3HandlesValidityProofData(srcPub, dstPub, auditor, gLo, gHi, lo, hi, oLo, oHi);
  const pad = new zk.PedersenOpening();
  const range = new zk.BatchedRangeProofU128Data(
    [nbCommit, zk.PedersenCommitment.fromBytes(gLoB.slice(0, 32)), zk.PedersenCommitment.fromBytes(gHiB.slice(0, 32)), zk.PedersenCommitment.from(0n, pad)],
    new BigUint64Array([newBalance, lo, hi, 0n]),
    Uint8Array.from([64, 16, 32, 16]),
    [nbOpen, oLo, oHi, pad],
  );

  const { rpc } = client;
  const [eqIx] = await verifyCiphertextCommitmentEquality({ rpc, payer: owner, proofData: new Uint8Array(equality.toBytes()) });
  const [valIx] = await verifyBatchedGroupedCiphertext3HandlesValidity({ rpc, payer: owner, proofData: new Uint8Array(validity.toBytes()) });
  const [rangeIx] = await verifyBatchedRangeProofU128({ rpc, payer: owner, proofData: new Uint8Array(range.toBytes()) });

  const transferIx = getConfidentialTransferInstruction({
    sourceToken: source,
    mint,
    destinationToken: dest,
    instructionsSysvar: SYSVAR_INSTRUCTIONS,
    authority: owner,
    newSourceDecryptableAvailableBalance: aesKey.encrypt(newBalance).toBytes(),
    transferAmountAuditorCiphertextLo: extract(gLoB, 2),
    transferAmountAuditorCiphertextHi: extract(gHiB, 2),
    equalityProofInstructionOffset: -3,
    ciphertextValidityProofInstructionOffset: -2,
    rangeProofInstructionOffset: -1,
  });

  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: 1 }),
    (m) => setTransactionMessageFeePayerSigner(owner, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => setTransactionMessageComputeUnitLimit(400_000, m),
    (m) => setTransactionMessageLoadedAccountsDataSizeLimit(32 * 1024 * 1024, m),
    (m) => appendTransactionMessageInstructions([eqIx, valIx, rangeIx, transferIx], m),
  );
  const signed = await signTransactionMessageWithSigners(message);
  assertIsSendableTransaction(signed);
  assertIsTransactionWithBlockhashLifetime(signed);
  const wire = getBase64EncodedWireTransaction(signed);
  const bytes = Math.ceil((wire.length * 3) / 4);

  await sendAndConfirmTransactionFactory({ rpc: client.rpc, rpcSubscriptions: client.rpcSubscriptions })(signed, { commitment: "confirmed" });
  return { signature: getSignatureFromTransaction(signed), bytes };
}

const CONFIDENTIAL_TRANSFER_DISCRIMINATOR = 27;
const CONFIDENTIAL_TRANSFER_INNER_DISCRIMINATOR = 7;

export interface TransactionReceipt {
  version: "legacy" | number;
  slot: bigint;
  computeUnits: bigint | null;
  err: unknown;
  logs: string[];
  /** Program names invoked at the top level, in order. */
  programs: string[];
}

const KNOWN_PROGRAMS: Record<string, string> = {
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "Token-2022",
  ZkE1Gama1Proof11111111111111111111111111111: "ZK ElGamal Proof",
  ComputeBudget111111111111111111111111111111: "Compute Budget",
  "11111111111111111111111111111111": "System",
};

/** Reads a transaction of any version (legacy, 0 or 1) and summarises what the chain recorded. */
export async function fetchTransactionReceipt(client: SolanaClient, signature: Signature): Promise<TransactionReceipt | null> {
  const result = await client.rpc
    .getTransaction(signature, { commitment: "confirmed", encoding: "json", maxSupportedTransactionVersion: 1 as never })
    .send();
  if (!result) return null;
  const message = result.transaction.message as { accountKeys?: readonly string[]; staticAccountKeys?: readonly string[]; instructions: readonly { programIdIndex: number }[] };
  const keys = (message.accountKeys ?? message.staticAccountKeys ?? []) as string[];
  const programs = message.instructions.map((ix) => KNOWN_PROGRAMS[keys[ix.programIdIndex]] ?? keys[ix.programIdIndex]);
  return {
    version: (result.version ?? "legacy") as "legacy" | number,
    slot: result.slot,
    computeUnits: result.meta?.computeUnitsConsumed ?? null,
    err: result.meta?.err ?? null,
    logs: [...(result.meta?.logMessages ?? [])],
    programs,
  };
}

/**
 * Auditor decryption that understands every transaction version. The
 * standard client only requests version 0 and therefore cannot read V1
 * transfers.
 */
export async function auditTransferAmountAnyVersion(client: SolanaClient, auditor: MessagePartialSigner, signature: Signature): Promise<bigint> {
  await initZk();
  const zk = await import("@solana/zk-sdk/web");
  const { deriveAuditorElgamalKeypair } = await import("@softseco/confidential-transfers");
  const { getConfidentialTransferInstructionDataDecoder } = await import("@solana-program/token-2022");
  const { getBase58Encoder } = await import("@solana/kit");

  const result = await client.rpc
    .getTransaction(signature, { commitment: "confirmed", encoding: "json", maxSupportedTransactionVersion: 1 as never })
    .send();
  if (!result) throw new Error("Transaction not found");
  const message = result.transaction.message as { accountKeys?: readonly string[]; staticAccountKeys?: readonly string[]; instructions: readonly { programIdIndex: number; data: string }[] };
  const keys = (message.accountKeys ?? message.staticAccountKeys ?? []) as string[];
  const secret = (await deriveAuditorElgamalKeypair(auditor)).secret();
  const base58 = getBase58Encoder();
  for (const ix of message.instructions) {
    if (keys[ix.programIdIndex] !== TOKEN_2022_PROGRAM_ADDRESS) continue;
    const data = new Uint8Array(base58.encode(ix.data as never));
    if (data[0] !== CONFIDENTIAL_TRANSFER_DISCRIMINATOR || data[1] !== CONFIDENTIAL_TRANSFER_INNER_DISCRIMINATOR) continue;
    const decoded = getConfidentialTransferInstructionDataDecoder().decode(data);
    const lo = zk.ElGamalCiphertext.fromBytes(new Uint8Array(decoded.transferAmountAuditorCiphertextLo));
    const hi = zk.ElGamalCiphertext.fromBytes(new Uint8Array(decoded.transferAmountAuditorCiphertextHi));
    if (!lo || !hi) throw new Error("Could not parse the auditor ciphertext");
    return secret.decrypt(lo) + (secret.decrypt(hi) << LO_BITS);
  }
  throw new Error("No confidential transfer in this transaction");
}
