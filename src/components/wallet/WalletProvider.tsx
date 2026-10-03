"use client";

import { useMemo, type ReactNode } from "react";
import { SelectedWalletAccountContextProvider } from "@solana/react";
import type { UiWallet } from "@wallet-standard/react";
import { CHAIN } from "@/lib/solana/config";

const STORAGE_KEY = "payslip.wallet";

/**
 * Wires wallet-standard wallets into the app and remembers the selected
 * account across reloads. Only wallets that support the active cluster are
 * shown.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const stateSync = useMemo(
    () => ({
      getSelectedWallet: () => {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      },
      storeSelectedWallet: (key: string) => {
        try {
          localStorage.setItem(STORAGE_KEY, key);
        } catch {
          // ignore
        }
      },
      deleteSelectedWallet: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      },
    }),
    [],
  );

  const filterWallets = (wallet: UiWallet) => wallet.chains.includes(CHAIN);

  return (
    <SelectedWalletAccountContextProvider filterWallets={filterWallets} stateSync={stateSync}>
      {children}
    </SelectedWalletAccountContextProvider>
  );
}
