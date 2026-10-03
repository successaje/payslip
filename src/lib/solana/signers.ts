import type {
  Address,
  MessageModifyingSigner,
  MessagePartialSigner,
  SignableMessage,
  SignatureDictionary,
  TransactionModifyingSigner,
  TransactionSigner,
} from "@solana/kit";

/**
 * The confidential-transfers client wants an `owner` that is both a
 * `TransactionSigner` and a `MessagePartialSigner`. Wallet-standard wallets
 * expose a `MessageModifyingSigner` (they may rewrite the message) and a
 * `TransactionModifyingSigner`. This module adapts the two.
 */
export type WalletSigner = TransactionSigner & MessagePartialSigner;

const keyOf = (bytes: Uint8Array) => Array.from(bytes).join(",");

/**
 * Wraps a modifying message signer as a partial signer, caching signatures
 * by message content for the lifetime of the object. The confidential keys
 * are derived from a constant message, so caching means the wallet asks the
 * user for that signature once per session rather than once per operation.
 */
export function toPartialMessageSigner<A extends string>(
  signer: MessageModifyingSigner<A>,
): MessagePartialSigner<A> {
  const cache = new Map<string, SignatureDictionary>();
  return {
    address: signer.address,
    async signMessages(messages: readonly SignableMessage[]) {
      const results: SignatureDictionary[] = new Array(messages.length);
      const pending: { index: number; message: SignableMessage }[] = [];
      messages.forEach((m, i) => {
        const hit = cache.get(keyOf(m.content));
        if (hit) results[i] = hit;
        else pending.push({ index: i, message: m });
      });
      if (pending.length) {
        const signed = await signer.modifyAndSignMessages(pending.map((p) => p.message));
        signed.forEach((s, j) => {
          const sig = s.signatures;
          if (!sig[signer.address]) throw new Error("Wallet did not return a signature for this account");
          cache.set(keyOf(pending[j].message.content), sig);
          results[pending[j].index] = sig;
        });
      }
      return results;
    },
  };
}

export function createWalletSigner<A extends string>(
  address: Address<A>,
  tx: TransactionModifyingSigner<A>,
  msg: MessageModifyingSigner<A>,
): WalletSigner {
  const partial = toPartialMessageSigner(msg);
  return {
    address,
    modifyAndSignTransactions: tx.modifyAndSignTransactions.bind(tx),
    signMessages: partial.signMessages,
  } as WalletSigner;
}
