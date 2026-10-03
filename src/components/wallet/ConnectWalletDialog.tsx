"use client";

import { useState } from "react";
import { useConnect, useWallets, type UiWallet, type UiWalletAccount } from "@wallet-standard/react";
import { useSelectedWalletAccount } from "@solana/react";
import { ExternalLink } from "lucide-react";
import { Dialog, Spinner, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CHAIN } from "@/lib/solana/config";
import { describeError } from "@/lib/errors";

function WalletRow({ wallet, onConnected }: { wallet: UiWallet; onConnected: (accounts: readonly UiWalletAccount[]) => void }) {
  const [isConnecting, connect] = useConnect(wallet);
  const { toast } = useToast();
  const dev = wallet.name === "Payslip Dev Wallet";

  return (
    <button
      type="button"
      disabled={isConnecting}
      onClick={async () => {
        try {
          const accounts = (await connect()).filter((a) => a.chains.includes(CHAIN));
          if (accounts.length === 0) throw new Error("The wallet did not return an account for this network.");
          onConnected(accounts);
        } catch (e) {
          const msg = describeError(e);
          if (!msg.cancelled) toast({ tone: "error", title: "Could not connect", description: msg.message });
        }
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-line px-3 py-2.5 text-left transition-colors",
        "hover:bg-paper-sunken disabled:opacity-60",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={wallet.icon} alt="" className="h-8 w-8 rounded-[6px]" />
      <span className="flex-1">
        <span className="block text-[14px] font-medium text-ink">{wallet.name}</span>
        {dev && <span className="block text-[12px] text-amber">Devnet only · keys stay in this browser</span>}
      </span>
      {isConnecting ? <Spinner size={16} className="text-ink-3" /> : null}
    </button>
  );
}

export function ConnectWalletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wallets = useWallets();
  const [, setSelected] = useSelectedWalletAccount();
  const [busy] = useState(false);
  const [choices, setChoices] = useState<readonly UiWalletAccount[] | null>(null);
  const usable = wallets.filter((w) => w.chains.includes(CHAIN));

  const close = () => {
    setChoices(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      locked={busy}
      size="sm"
      title={choices ? "Choose an account" : "Connect a wallet"}
      description={
        choices
          ? "This wallet has more than one account. Pick the one to use with Payslip."
          : "Your wallet signs transactions and derives the keys that protect your balances. Payslip never sees them."
      }
    >
      {choices ? (
        <div className="flex flex-col gap-2">
          {choices.map((a) => (
            <button
              key={a.address}
              type="button"
              onClick={() => {
                setSelected(a);
                close();
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-line px-3 py-2.5 text-left hover:bg-paper-sunken"
            >
              <span className="flex-1">
                <span className="block text-[14px] font-medium text-ink">{a.label ?? "Account"}</span>
                <span className="block font-mono text-[12px] text-ink-3">{a.address}</span>
              </span>
            </button>
          ))}
        </div>
      ) : usable.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-line-strong p-4 text-center">
          <p className="text-[14px] font-medium text-ink">No Solana wallet found</p>
          <p className="mt-1 text-[13px] text-ink-3 text-pretty">
            Install Phantom or Solflare, then reload this page.
          </p>
          <a
            href="https://phantom.com/download"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink underline underline-offset-2"
          >
            Get Phantom <ExternalLink size={13} />
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {usable.map((w) => (
            <WalletRow
              key={w.name}
              wallet={w}
              onConnected={(accounts) => {
                if (accounts.length === 1) {
                  setSelected(accounts[0]);
                  close();
                } else {
                  setChoices(accounts);
                }
              }}
            />
          ))}
        </div>
      )}
    </Dialog>
  );
}
