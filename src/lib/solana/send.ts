import {
  appendTransactionMessageInstructions,
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import type { SolanaClient } from "./rpc";

export type SendStage = "preparing" | "signing" | "submitted" | "confirming" | "confirmed";

export interface SendOptions {
  onStage?: (stage: SendStage) => void;
}

/**
 * Builds, signs and confirms one transaction from a list of instructions.
 * Reports coarse stages so the UI can narrate what is happening.
 */
export async function sendInstructions(
  client: SolanaClient,
  payer: TransactionSigner,
  instructions: Instruction[],
  { onStage }: SendOptions = {},
): Promise<Signature> {
  onStage?.("preparing");
  const { value: blockhash } = await client.rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  onStage?.("signing");
  const signed = await signTransactionMessageWithSigners(message);
  assertIsSendableTransaction(signed);
  assertIsTransactionWithBlockhashLifetime(signed);
  onStage?.("submitted");
  const send = sendAndConfirmTransactionFactory({ rpc: client.rpc, rpcSubscriptions: client.rpcSubscriptions });
  onStage?.("confirming");
  await send(signed, { commitment: "confirmed" });
  onStage?.("confirmed");
  return getSignatureFromTransaction(signed);
}
