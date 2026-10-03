"use client";

import { useEffect, type ReactNode } from "react";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { registerDevWalletIfEnabled } from "@/lib/solana/devWallet";

/** Client-side providers for the authenticated product. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerDevWalletIfEnabled();
  }, []);
  return <WalletProvider>{children}</WalletProvider>;
}
