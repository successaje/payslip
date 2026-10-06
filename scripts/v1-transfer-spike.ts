/**
 * Reproducible spike (run with `npx tsx scripts/v1-transfer-spike.ts`, env MINT, DEST, AUDITOR, AMOUNT):
 * a full confidential transfer in ONE Transaction V1 (4,096 bytes).
 * Three inline proof verifications + the transfer instruction, no context
 * state accounts, no cleanup.
 */
import {
  createKeyPairSignerFromBytes,
  address,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  getAddressEncoder,
  isSome,
} from "@solana/kit";
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  fetchToken,
  findAssociatedTokenPda,
  getConfidentialTransferInstruction,
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
  GroupedElGamalCiphertext3Handles,
  PedersenCommitment,
  PedersenOpening,
} from "@solana/zk-sdk/node";
import { deriveConfidentialKeys } from "@softseco/confidential-transfers";
import { ristretto255 } from "@noble/curves/ed25519.js";
import fs from "node:fs";
import { makeRpc } from "./rpc";

const { Point } = ristretto255;
const LO_BITS = 16n;
const SYSVAR_INSTRUCTIONS = address("Sysvar1nstructions1111111111111111111111111");

const P = Point as unknown as { fromBytes?: (b: Uint8Array) => InstanceType<typeof Point>; fromHex: (b: Uint8Array | string) => InstanceType<typeof Point> };
const fromBytes = (b: Uint8Array) => (P.fromBytes ? P.fromBytes(Uint8Array.from(b)) : P.fromHex(Uint8Array.from(b)));
function pts(c: Uint8Array) {
  return { c: fromBytes(c.slice(0, 32)), h: fromBytes(c.slice(32, 64)) };
}
function toCt(c: InstanceType<typeof Point>, h: InstanceType<typeof Point>) {
  const out = new Uint8Array(64);
  out.set((c as unknown as { toBytes: () => Uint8Array }).toBytes(), 0);
  out.set((h as unknown as { toBytes: () => Uint8Array }).toBytes(), 32);
  return out;
}
function extract(grouped: Uint8Array, handle: number) {
  const out = new Uint8Array(64);
  out.set(grouped.slice(0, 32), 0);
  out.set(grouped.slice(32 + handle * 32, 64 + handle * 32), 32);
  return out;
}
function subLoHi(left: Uint8Array, lo: Uint8Array, hi: Uint8Array) {
  const scale = 1n << LO_BITS;
  const L = pts(left), l = pts(lo), h = pts(hi);
  return toCt(L.c.subtract(l.c.add(h.c.multiply(scale))), L.h.subtract(l.h.add(h.h.multiply(scale))));
}

async function main() {
  const { rpc, rpcSubscriptions } = makeRpc("https://api.devnet.solana.com", "wss://api.devnet.solana.com");
  const payer = await createKeyPairSignerFromBytes(
    new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8"))),
  );
  const mint = address(process.env.MINT!);
  const destOwner = address(process.env.DEST!);
  const amount = BigInt(process.env.AMOUNT ?? "1000000");
  const auditor = process.env.AUDITOR ? ElGamalPubkey.fromBytes(getAddressEncoder().encode(address(process.env.AUDITOR)) as Uint8Array) : ElGamalPubkey.fromBytes(new Uint8Array(32));

  const [source] = await findAssociatedTokenPda({ owner: payer.address, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  const [dest] = await findAssociatedTokenPda({ owner: destOwner, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  const { elgamalKeypair, aesKey } = await deriveConfidentialKeys({ signer: payer });

  const [{ data: s }, { data: d }] = await Promise.all([fetchToken(rpc, source), fetchToken(rpc, dest)]);
  const ext = (t: typeof s) => {
    if (!isSome(t.extensions)) throw new Error("no ext");
    const e = t.extensions.value.find((x) => x.__kind === "ConfidentialTransferAccount");
    if (!e || e.__kind !== "ConfidentialTransferAccount") throw new Error("not configured");
    return e;
  };
  const sExt = ext(s), dExt = ext(d);
  const srcPub = elgamalKeypair.pubkey();
  const dstPub = ElGamalPubkey.fromBytes(getAddressEncoder().encode(dExt.elgamalPubkey) as Uint8Array);

  const lo = amount & ((1n << LO_BITS) - 1n), hi = amount >> LO_BITS;
  const oLo = new PedersenOpening(), oHi = new PedersenOpening();
  const gLo = GroupedElGamalCiphertext3Handles.encryptWith(srcPub, dstPub, auditor, lo, oLo);
  const gHi = GroupedElGamalCiphertext3Handles.encryptWith(srcPub, dstPub, auditor, hi, oHi);
  const gLoB = gLo.toBytes(), gHiB = gHi.toBytes();

  const current = aesKey.decrypt(AeCiphertext.fromBytes(new Uint8Array(sExt.decryptableAvailableBalance))!);
  const newBal = current - amount;
  if (newBal < 0n) throw new Error(`insufficient: ${current}`);
  const nbOpen = new PedersenOpening();
  const nbCommit = PedersenCommitment.from(newBal, nbOpen);
  const nbCt = ElGamalCiphertext.fromBytes(subLoHi(new Uint8Array(sExt.availableBalance), extract(gLoB, 0), extract(gHiB, 0)))!;

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

  const { value: bh } = await rpc.getLatestBlockhash().send();
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
  console.log("wire bytes:", Buffer.from(wire, "base64").length);
  const sim = await rpc.simulateTransaction(wire, { encoding: "base64", replaceRecentBlockhash: true, sigVerify: false }).send();
  console.log("sim err:", JSON.stringify(sim.value.err), "CU:", sim.value.unitsConsumed?.toString());
  if (sim.value.err) { console.log((sim.value.logs ?? []).slice(-12).join("\n")); process.exit(1); }
  const t0 = Date.now();
  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed as never, { commitment: "confirmed", skipPreflight: true });
  console.log("CONFIRMED", getSignatureFromTransaction(signed), `${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
