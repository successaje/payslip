/**
 * Developer wallet (devnet only).
 *
 * A wallet-standard wallet backed by a keypair stored in localStorage. It
 * exists so the whole product can be exercised in a browser without an
 * extension. It is registered only when `NEXT_PUBLIC_ENABLE_DEV_WALLET=true`
 * and the cluster is devnet, and it is never part of a production bundle path.
 *
 * It implements the same features a real wallet does, so the app code path
 * is identical: standard:connect/disconnect/events, solana:signMessage,
 * solana:signTransaction, solana:signAndSendTransaction.
 */
import { registerWallet } from "@wallet-standard/wallet";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import {
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignMessageFeature,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type StandardEventsFeature,
  type StandardEventsListeners,
} from "@wallet-standard/features";
import { ed25519 } from "@noble/curves/ed25519.js";
import {
  createKeyPairSignerFromBytes,
  getAddressDecoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransaction,
  getSignatureFromTransaction,
} from "@solana/kit";
import { CHAIN, CLUSTER } from "./config";
import { getSolanaClient } from "./rpc";

const STORAGE_KEY = "payslip.devwallet.secret";

function loadOrCreateSecret(): Uint8Array {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return Uint8Array.from(JSON.parse(stored) as number[]);
  } catch {
    // fall through to create
  }
  const secret = ed25519.utils.randomSecretKey();
  const pub = ed25519.getPublicKey(secret);
  const full = new Uint8Array(64);
  full.set(secret, 0);
  full.set(pub, 32);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(full)));
  } catch {
    // ignore
  }
  return full;
}

const ICON =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#171614"/><path d="M9 11h14M9 16h14M9 21h8" stroke="#f7f6f2" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  );

class DevWallet implements Wallet {
  readonly version = "1.0.0" as const;
  readonly name = "Payslip Dev Wallet";
  readonly icon = ICON as Wallet["icon"];
  readonly chains = [CHAIN] as const;

  #secret: Uint8Array;
  #account: WalletAccount;
  #listeners: StandardEventsListeners["change"][] = [];
  #connected = false;

  constructor() {
    this.#secret = loadOrCreateSecret();
    const pub = this.#secret.slice(32);
    this.#account = {
      address: getAddressDecoder().decode(pub),
      publicKey: pub,
      chains: [CHAIN],
      features: [SolanaSignMessage, SolanaSignTransaction, SolanaSignAndSendTransaction],
    };
  }

  get accounts() {
    return this.#connected ? [this.#account] : [];
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignMessageFeature &
    SolanaSignTransactionFeature &
    SolanaSignAndSendTransactionFeature {
    return {
      [StandardConnect]: { version: "1.0.0", connect: this.#connect },
      [StandardDisconnect]: { version: "1.0.0", disconnect: this.#disconnect },
      [StandardEvents]: { version: "1.0.0", on: this.#on },
      [SolanaSignMessage]: { version: "1.1.0", signMessage: this.#signMessage },
      [SolanaSignTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0, 1],
        signTransaction: this.#signTransaction,
      },
      [SolanaSignAndSendTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0, 1],
        signAndSendTransaction: this.#signAndSendTransaction,
      },
    };
  }

  #emit() {
    for (const l of this.#listeners) l({ accounts: this.accounts });
  }

  #on: StandardEventsFeature[typeof StandardEvents]["on"] = (_event, listener) => {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter((l) => l !== listener);
    };
  };

  #connect: StandardConnectFeature[typeof StandardConnect]["connect"] = async () => {
    this.#connected = true;
    this.#emit();
    return { accounts: this.accounts };
  };

  #disconnect: StandardDisconnectFeature[typeof StandardDisconnect]["disconnect"] = async () => {
    this.#connected = false;
    this.#emit();
  };

  #signMessage: SolanaSignMessageFeature[typeof SolanaSignMessage]["signMessage"] = async (...inputs) =>
    inputs.map(({ message }) => ({
      signedMessage: message,
      signature: ed25519.sign(message, this.#secret.slice(0, 32)),
      signatureType: "ed25519" as const,
    }));

  async #signBytes(bytes: Uint8Array): Promise<Uint8Array> {
    const signer = await createKeyPairSignerFromBytes(this.#secret);
    const tx = getTransactionDecoder().decode(bytes);
    const signed = await partiallySignTransaction([signer.keyPair], tx);
    return new Uint8Array(getTransactionEncoder().encode(signed));
  }

  #signTransaction: SolanaSignTransactionFeature[typeof SolanaSignTransaction]["signTransaction"] = async (
    ...inputs
  ) => {
    const out = [];
    for (const { transaction } of inputs) out.push({ signedTransaction: await this.#signBytes(transaction) });
    return out;
  };

  #signAndSendTransaction: SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction]["signAndSendTransaction"] =
    async (...inputs) => {
      const { rpc } = getSolanaClient();
      const out = [];
      for (const { transaction } of inputs) {
        const signedBytes = await this.#signBytes(transaction);
        const signed = getTransactionDecoder().decode(signedBytes);
        await rpc
          .sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64", preflightCommitment: "confirmed" })
          .send();
        const sig = getSignatureFromTransaction(signed as never);
        out.push({ signature: new TextEncoder().encode(sig) });
      }
      return out;
    };
}

let registered = false;

export function registerDevWalletIfEnabled() {
  if (registered || typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_WALLET !== "true" || CLUSTER !== "devnet") return;
  registered = true;
  registerWallet(new DevWallet());
}

export const DEV_WALLET_NAME = "Payslip Dev Wallet";
