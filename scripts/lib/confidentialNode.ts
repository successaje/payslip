/**
 * Node-side confidential transfer helpers for scripts. The browser app has
 * its own copies in src/lib/solana; these use the zk-sdk Node build.
 */
import {
  address,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getAddressEncoder,
  getBase58Encoder,
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
  type Instruction,
  type MessagePartialSigner,
  type Rpc,
  type RpcSubscriptions,
  type Signature,
  type SolanaRpcApi,
  type SolanaRpcSubscriptionsApi,
  type TransactionSigner,
} from "@solana/kit";
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  fetchToken,
  findAssociatedTokenPda,
  getConfidentialTransferInstruction,
  getConfidentialTransferInstructionDataDecoder,
} from "@solana-program/token-2022";
import {
  verifyBatchedGroupedCiphertext3HandlesValidity,
  verifyBatchedRangeProofU128,
  verifyCiphertextCommitmentEquality,
} from "@solana-program/zk-elgamal-proof";
import {
  AeCiphertext,
  BatchedGroupedCiphertext3HandlesValidityProofData,
  BatchedRangeProofU128Data,
  CiphertextCommitmentEqualityProofData,
  ElGamalCiphertext,
  ElGamalPubkey,
  type ElGamalKeypair,
  GroupedElGamalCiphertext3Handles,
  PedersenCommitment,
  PedersenOpening,
} from "@solana/zk-sdk/node";
import { deriveConfidentialKeys } from "@softseco/confidential-transfers";
import { ristretto255 } from "@noble/curves/ed25519.js";

export type Client = { rpc: Rpc<SolanaRpcApi>; rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi> };
export type Owner = TransactionSigner & MessagePartialSigner;

const LO_BITS = 16n;
const SYSVAR_INSTRUCTIONS = address("Sysvar1nstructions1111111111111111111111111");
const ZK_PROGRAM = "ZkE1Gama1Proof11111111111111111111111111111";
const CT_DISCRIMINATOR = 27;
const CT_INNER = 7;
const VALIDITY_DISCRIMINATOR = 12;

type RPoint = { add(p: RPoint): RPoint; subtract(p: RPoint): RPoint; multiply(n: bigint): RPoint; toBytes(): Uint8Array };
const P = ristretto255.Point as unknown as { fromBytes?: (b: Uint8Array) => RPoint; fromHex: (b: Uint8Array) => RPoint };
const fromBytes = (b: Uint8Array) => (P.fromBytes ? P.fromBytes(Uint8Array.from(b)) : P.fromHex(Uint8Array.from(b)));
const pts = (c: Uint8Array) => ({ c: fromBytes(c.slice(0, 32)), h: fromBytes(c.slice(32, 64)) });
function toCt(c: RPoint, h: RPoint) {
  const out = new Uint8Array(64);
  out.set(c.toBytes(), 0);
  out.set(h.toBytes(), 32);
  return out;
}
/** (commitment, handle i) out of a 3-handle grouped ciphertext. */
export function extract(grouped: Uint8Array, handle: number) {
  const out = new Uint8Array(64);
  out.set(grouped.slice(0, 32), 0);
  out.set(grouped.slice(32 + handle * 32, 64 + handle * 32), 32);
  return out;
}
function subLoHi(left: Uint8Array, lo: Uint8Array, hi: Uint8Array) {
  const s = 1n << LO_BITS;
  const L = pts(left), l = pts(lo), h = pts(hi);
  return toCt(L.c.subtract(l.c.add(h.c.multiply(s))), L.h.subtract(l.h.add(h.h.multiply(s))));
}

/** Sends a legacy-version transaction with the given instructions and waits for confirmation. */
export async function sendTx(client: Client, payer: TransactionSigner, instructions: Instruction[]): Promise<Signature> {
  const { value: bh } = await client.rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const msg = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const signed = await signTransactionMessageWithSigners(msg);
  await sendAndConfirmTransactionFactory(client)(signed as never, { commitment: "confirmed" });
  return getSignatureFromTransaction(signed);
}

export interface V1Result {
  signature: Signature;
  bytes: number;
  computeUnits: bigint | null;
  seconds: number;
}

/** One confidential transfer in a single Transaction V1: three inline proofs, then the transfer. */
export async function confidentialTransferV1(
  client: Client,
  payer: Owner,
  mint: Address,
  destOwner: Address,
  amount: bigint,
  auditorElgamalPubkey: Address | null,
): Promise<V1Result> {
  const { rpc, rpcSubscriptions } = client;
  const [source] = await findAssociatedTokenPda({ owner: payer.address, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  const [dest] = await findAssociatedTokenPda({ owner: destOwner, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  const { elgamalKeypair, aesKey } = await deriveConfidentialKeys({ signer: payer });
  const enc = getAddressEncoder();
  const auditor = auditorElgamalPubkey ? ElGamalPubkey.fromBytes(enc.encode(auditorElgamalPubkey) as Uint8Array) : ElGamalPubkey.fromBytes(new Uint8Array(32));

  const [{ data: s }, { data: d }] = await Promise.all([fetchToken(rpc, source), fetchToken(rpc, dest)]);
  const ext = (t: typeof s) => {
    if (!isSome(t.extensions)) throw new Error("account has no extensions");
    const e = t.extensions.value.find((x) => x.__kind === "ConfidentialTransferAccount");
    if (!e || e.__kind !== "ConfidentialTransferAccount") throw new Error("account is not configured for confidential transfers");
    return e;
  };
  const sExt = ext(s), dExt = ext(d);
  const srcPub = elgamalKeypair.pubkey();
  const dstPub = ElGamalPubkey.fromBytes(enc.encode(dExt.elgamalPubkey) as Uint8Array);

  const lo = amount & ((1n << LO_BITS) - 1n), hi = amount >> LO_BITS;
  const oLo = new PedersenOpening(), oHi = new PedersenOpening();
  const gLo = GroupedElGamalCiphertext3Handles.encryptWith(srcPub, dstPub, auditor, lo, oLo);
  const gHi = GroupedElGamalCiphertext3Handles.encryptWith(srcPub, dstPub, auditor, hi, oHi);
  const gLoB = gLo.toBytes(), gHiB = gHi.toBytes();

  const currentCt = AeCiphertext.fromBytes(new Uint8Array(sExt.decryptableAvailableBalance));
  if (!currentCt) throw new Error("could not read the source private balance");
  const current = aesKey.decrypt(currentCt);
  const newBal = current - amount;
  if (newBal < 0n) throw new Error(`not enough private balance: have ${current}, need ${amount}`);
  const nbOpen = new PedersenOpening();
  const nbCommit = PedersenCommitment.from(newBal, nbOpen);
  const nbCt = ElGamalCiphertext.fromBytes(subLoHi(new Uint8Array(sExt.availableBalance), extract(gLoB, 0), extract(gHiB, 0)));
  if (!nbCt) throw new Error("could not derive the new balance ciphertext");

  const eq = new CiphertextCommitmentEqualityProofData(elgamalKeypair, nbCt, nbCommit, nbOpen, newBal);
  const val = new BatchedGroupedCiphertext3HandlesValidityProofData(srcPub, dstPub, auditor, gLo, gHi, lo, hi, oLo, oHi);
  const pad = new PedersenOpening();
  const range = new BatchedRangeProofU128Data(
    [nbCommit, PedersenCommitment.fromBytes(gLoB.slice(0, 32)), PedersenCommitment.fromBytes(gHiB.slice(0, 32)), PedersenCommitment.from(0n, pad)],
    new BigUint64Array([newBal, lo, hi, 0n]),
    Uint8Array.from([64, 16, 32, 16]),
    [nbOpen, oLo, oHi, pad],
  );

  const [eqIx] = await verifyCiphertextCommitmentEquality({ rpc, payer, proofData: new Uint8Array(eq.toBytes()) });
  const [valIx] = await verifyBatchedGroupedCiphertext3HandlesValidity({ rpc, payer, proofData: new Uint8Array(val.toBytes()) });
  const [rangeIx] = await verifyBatchedRangeProofU128({ rpc, payer, proofData: new Uint8Array(range.toBytes()) });
  const transferIx = getConfidentialTransferInstruction({
    sourceToken: source,
    mint,
    destinationToken: dest,
    instructionsSysvar: SYSVAR_INSTRUCTIONS,
    authority: payer,
    newSourceDecryptableAvailableBalance: aesKey.encrypt(newBal).toBytes(),
    transferAmountAuditorCiphertextLo: extract(gLoB, 2),
    transferAmountAuditorCiphertextHi: extract(gHiB, 2),
    equalityProofInstructionOffset: -3,
    ciphertextValidityProofInstructionOffset: -2,
    rangeProofInstructionOffset: -1,
  });

  const { value: bh } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const msg = pipe(
    createTransactionMessage({ version: 1 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m),
    (m) => setTransactionMessageComputeUnitLimit(400_000, m),
    (m) => setTransactionMessageLoadedAccountsDataSizeLimit(32 * 1024 * 1024, m),
    (m) => appendTransactionMessageInstructions([eqIx, valIx, rangeIx, transferIx], m),
  );
  const signed = await signTransactionMessageWithSigners(msg);
  const wire = getBase64EncodedWireTransaction(signed);
  const sim = await rpc.simulateTransaction(wire, { encoding: "base64", replaceRecentBlockhash: true, sigVerify: false }).send();
  if (sim.value.err) throw new Error(`simulation failed: ${JSON.stringify(sim.value.err)}\n${(sim.value.logs ?? []).slice(-12).join("\n")}`);
  const t0 = Date.now();
  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed as never, { commitment: "confirmed", skipPreflight: true });
  return {
    signature: getSignatureFromTransaction(signed),
    bytes: Buffer.from(wire, "base64").length,
    computeUnits: sim.value.unitsConsumed ?? null,
    seconds: (Date.now() - t0) / 1000,
  };
}

interface RawIx {
  program: string;
  data: Uint8Array;
}
async function fetchInstructions(rpc: Rpc<SolanaRpcApi>, signature: Signature): Promise<RawIx[]> {
  const r = await rpc.getTransaction(signature, { commitment: "confirmed", encoding: "json", maxSupportedTransactionVersion: 1 as never }).send();
  if (!r) throw new Error("transaction not found");
  const m = r.transaction.message as { accountKeys?: readonly string[]; staticAccountKeys?: readonly string[]; instructions: readonly { programIdIndex: number; data: string }[] };
  const keys = (m.accountKeys ?? m.staticAccountKeys ?? []) as string[];
  const b58 = getBase58Encoder();
  return m.instructions.map((ix) => ({ program: keys[ix.programIdIndex], data: new Uint8Array(b58.encode(ix.data as never)) }));
}

/** The auditor reads the amount of a transfer from the auditor ciphertext in the transfer instruction. */
export async function auditorAmount(rpc: Rpc<SolanaRpcApi>, auditor: ElGamalKeypair, signature: Signature): Promise<bigint> {
  const secret = auditor.secret();
  for (const ix of await fetchInstructions(rpc, signature)) {
    if (ix.program !== TOKEN_2022_PROGRAM_ADDRESS || ix.data[0] !== CT_DISCRIMINATOR || ix.data[1] !== CT_INNER) continue;
    const d = getConfidentialTransferInstructionDataDecoder().decode(ix.data);
    const lo = ElGamalCiphertext.fromBytes(new Uint8Array(d.transferAmountAuditorCiphertextLo));
    const hi = ElGamalCiphertext.fromBytes(new Uint8Array(d.transferAmountAuditorCiphertextHi));
    if (!lo || !hi) throw new Error("could not parse auditor ciphertext");
    return secret.decrypt(lo) + (secret.decrypt(hi) << LO_BITS);
  }
  throw new Error("no confidential transfer in this transaction");
}

/** The recipient reads the amount from the validity proof's second handle, as the app's Statements page does. */
export async function recipientAmount(rpc: Rpc<SolanaRpcApi>, recipient: Owner, signature: Signature): Promise<bigint> {
  const { elgamalKeypair } = await deriveConfidentialKeys({ signer: recipient });
  const secret = elgamalKeypair.secret();
  const myPub = new Uint8Array(elgamalKeypair.pubkey().toBytes());
  const ixs = await fetchInstructions(rpc, signature);
  const transfer = ixs.find((ix) => ix.program === TOKEN_2022_PROGRAM_ADDRESS && ix.data[0] === CT_DISCRIMINATOR && ix.data[1] === CT_INNER);
  if (!transfer) throw new Error("no confidential transfer in this transaction");
  const commitment = new Uint8Array(getConfidentialTransferInstructionDataDecoder().decode(transfer.data).transferAmountAuditorCiphertextLo).slice(0, 32);
  const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
  for (const ix of ixs) {
    if (ix.program !== ZK_PROGRAM || ix.data[0] !== VALIDITY_DISCRIMINATOR || ix.data.length < 353) continue;
    const ctx = ix.data.slice(1, 353);
    if (!same(ctx.slice(96, 128), commitment)) continue;
    if (!same(ctx.slice(32, 64), myPub)) throw new Error("transfer was not encrypted to this recipient");
    const lo = ElGamalCiphertext.fromBytes(extract(ctx.slice(96, 224), 1));
    const hi = ElGamalCiphertext.fromBytes(extract(ctx.slice(224, 352), 1));
    if (!lo || !hi) throw new Error("could not parse recipient ciphertext");
    return secret.decrypt(lo) + (secret.decrypt(hi) << LO_BITS);
  }
  throw new Error("validity proof not found in this transaction");
}
