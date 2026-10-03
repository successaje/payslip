"use client";

import { useMemo } from "react";
import {
  useSelectedWalletAccount,
  useWalletAccountMessageSigner,
  useWalletAccountTransactionSigner,
} from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { address } from "@solana/kit";
import { CHAIN } from "@/lib/solana/config";
import { createWalletSigner, type WalletSigner } from "@/lib/solana/signers";

/**
 * Builds the combined transaction + message signer for a connected account.
 * Must be rendered only when an account is selected; use `useWalletSigner`
 * for the nullable variant.
 */
function useSignerFor(account: UiWalletAccount): WalletSigner {
  const tx = useWalletAccountTransactionSigner(account, CHAIN);
  const msg = useWalletAccountMessageSigner(account);
  return useMemo(() => createWalletSigner(address(account.address), tx, msg), [account.address, tx, msg]);
}

export function SignerGate({ account, children }: { account: UiWalletAccount; children: (s: WalletSigner) => React.ReactNode }) {
  const signer = useSignerFor(account);
  return <>{children(signer)}</>;
}

export function useSelectedAccount(): UiWalletAccount | undefined {
  const [account] = useSelectedWalletAccount();
  return account;
}

export { useSignerFor };
