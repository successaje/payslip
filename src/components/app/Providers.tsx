"use client";

import { useState, type ReactNode } from "react";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { registerDevWalletIfEnabled } from "@/lib/solana/devWallet";

/** Client-side providers for the authenticated product. */
export function Providers({ children }: { children: ReactNode }) {
  // Register before the wallet provider mounts so a remembered selection of
  // the dev wallet can be restored on first render. Idempotent.
  useState(() => registerDevWalletIfEnabled());
  return <WalletProvider>{children}</WalletProvider>;
}
