"use client";

import { useState } from "react";
import { useSelectedWalletAccount } from "@solana/react";
import { Wallet } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui";
import { ConnectWalletDialog } from "./ConnectWalletDialog";
import { AccountMenu } from "./AccountMenu";

/**
 * Renders the account menu when connected, otherwise a connect button that
 * opens the wallet picker.
 */
export function ConnectButton({ onSignOut, ...props }: Omit<ButtonProps, "onClick"> & { onSignOut?: () => Promise<void> | void }) {
  const [account] = useSelectedWalletAccount();
  const [open, setOpen] = useState(false);

  if (account) return <AccountMenu account={account} onSignOut={onSignOut} />;

  return (
    <>
      <Button leadingIcon={<Wallet size={16} />} onClick={() => setOpen(true)} {...props}>
        {props.children ?? "Connect wallet"}
      </Button>
      <ConnectWalletDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
