"use client";

import { useEffect, useRef, useState } from "react";
import { useDisconnect, useWallets, uiWalletAccountBelongsToUiWallet, type UiWallet, type UiWalletAccount } from "@wallet-standard/react";
import { useSelectedWalletAccount } from "@solana/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftRight, Check, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { shortAddress } from "@/lib/format";
import { explorerUrl } from "@/lib/solana/config";
import { cn } from "@/lib/cn";

function DisconnectItem({ wallet, className, onBefore, onAfter }: { wallet: UiWallet; className: string; onBefore: () => Promise<void>; onAfter: () => void }) {
  const [, disconnect] = useDisconnect(wallet);
  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      onClick={async () => {
        await onBefore();
        try {
          await disconnect();
        } catch {
          // some wallets have no disconnect; clearing the selection is enough
        }
        onAfter();
      }}
    >
      <LogOut size={15} className="text-ink-3" />
      Disconnect
    </button>
  );
}

export function AccountMenu({ account, onSignOut }: { account: UiWalletAccount; onSignOut?: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setSelected] = useSelectedWalletAccount();
  const wallets = useWallets();
  const wallet = wallets.find((w) => uiWalletAccountBelongsToUiWallet(account, w));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = async () => {
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const item = "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13.5px] text-ink hover:bg-paper-sunken";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-paper-raised pl-2 pr-2.5 text-[13px] font-medium text-ink shadow-[var(--shadow-sm)] hover:bg-paper-sunken",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={account.icon} alt="" className="h-5 w-5 rounded" />
        <span className="font-mono">{shortAddress(account.address)}</span>
        <ChevronDown size={14} className={cn("text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-40 mt-1.5 w-56 origin-top-right rounded-[var(--radius-lg)] border border-line bg-paper-raised p-1.5 shadow-[var(--shadow-md)]"
          >
            <div className="px-2.5 pb-2 pt-1.5">
              <p className="text-[12px] text-ink-3">{account.label ?? "Connected"}</p>
              <p className="font-mono text-[12.5px] text-ink break-all">{account.address}</p>
            </div>
            <button type="button" role="menuitem" className={item} onClick={copy}>
              {copied ? <Check size={15} className="text-green" /> : <Copy size={15} className="text-ink-3" />}
              {copied ? "Copied" : "Copy address"}
            </button>
            <a role="menuitem" className={item} href={explorerUrl("address", account.address)} target="_blank" rel="noreferrer">
              <ExternalLink size={15} className="text-ink-3" />
              View on explorer
            </a>
            {wallet && wallet.accounts.length > 1 && (
              <>
                <div className="my-1 h-px bg-line" />
                <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-4">Switch account</p>
                {wallet.accounts
                  .filter((a) => a.address !== account.address)
                  .map((a) => (
                    <button
                      key={a.address}
                      type="button"
                      role="menuitem"
                      className={item}
                      onClick={async () => {
                        setOpen(false);
                        await onSignOut?.();
                        setSelected(a);
                      }}
                    >
                      <ArrowLeftRight size={15} className="text-ink-3" />
                      <span className="min-w-0 flex-1 truncate">
                        {a.label ?? shortAddress(a.address)}
                        <span className="ml-1 font-mono text-[12px] text-ink-3">{shortAddress(a.address)}</span>
                      </span>
                    </button>
                  ))}
              </>
            )}
            <div className="my-1 h-px bg-line" />
            {wallet ? (
              <DisconnectItem
                wallet={wallet}
                className={item}
                onBefore={async () => {
                  setOpen(false);
                  await onSignOut?.();
                }}
                onAfter={() => setSelected(undefined)}
              />
            ) : (
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={async () => {
                  setOpen(false);
                  await onSignOut?.();
                  setSelected(undefined);
                }}
              >
                <LogOut size={15} className="text-ink-3" />
                Disconnect
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
