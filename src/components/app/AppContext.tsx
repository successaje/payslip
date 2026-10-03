"use client";

import { createContext, useContext } from "react";
import type { UiWalletAccount } from "@wallet-standard/react";
import type { Me } from "@/lib/api/client";
import type { WalletSigner } from "@/lib/solana/signers";
import type { SolanaClient } from "@/lib/solana/rpc";
import type { Company } from "@/lib/db/schema";

export interface AppContextValue {
  account: UiWalletAccount;
  signer: WalletSigner;
  client: SolanaClient;
  me: Me;
  /** The company the employer is operating. Null for employee-only wallets. */
  company: Company | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppGate");
  return ctx;
}
