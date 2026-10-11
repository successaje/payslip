"use client";

import { useState } from "react";
import { useSelectedWalletAccount, useWalletAccountMessageSigner } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { Check, Copy } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Button, Card, CardBody, useToast } from "@/components/ui";
import { toPartialMessageSigner } from "@/lib/solana/signers";
import { auditorPublicKey } from "@/lib/solana/confidential";
import { describeError } from "@/lib/errors";
import { shortAddress } from "@/lib/format";

function Generator({ account }: { account: UiWalletAccount }) {
  const msg = useWalletAccountMessageSigner(account);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  return (
    <Card className="w-full">
      <CardBody className="pt-5">
        <p className="text-[13px] text-ink-3">Wallet</p>
        <p className="font-mono text-[14px] text-ink">{shortAddress(account.address, 6)}</p>
        {key ? (
          <>
            <p className="mt-4 text-[13px] text-ink-3">Your auditor key</p>
            <p className="mt-1 break-all rounded-[var(--radius-md)] bg-paper-sunken p-3 font-mono text-[13px] text-ink">{key}</p>
            <Button
              className="mt-3"
              variant="secondary"
              leadingIcon={copied ? <Check size={15} className="text-green" /> : <Copy size={15} />}
              onClick={async () => {
                await navigator.clipboard.writeText(key);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy key"}
            </Button>
            <p className="mt-4 text-[13px] text-ink-3 text-pretty">
              Send this to the person setting up the company along with your wallet address. The key lets you read
              payout amounts for their payout token. It cannot spend anything.
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-[14px] text-ink-2 text-pretty">
              Sign one message to derive your auditor key. The same wallet always produces the same key, so you can
              recover it any time.
            </p>
            <Button
              block
              size="lg"
              className="mt-5"
              loading={busy}
              loadingLabel="Waiting for your wallet…"
              onClick={async () => {
                setBusy(true);
                try {
                  setKey(await auditorPublicKey(toPartialMessageSigner(msg)));
                } catch (e) {
                  const d = describeError(e);
                  if (!d.cancelled) toast({ tone: "error", title: "Could not derive key", description: d.message });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Generate my auditor key
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}

export function AuditorKeyTool() {
  const [account] = useSelectedWalletAccount();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4 md:px-6">
        <Wordmark />
        <ConnectButton size="sm" variant="secondary" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Auditor key</h1>
        <p className="mt-2 text-[14px] text-ink-3 text-pretty">
          A company has asked you to be the auditor of its payouts. Connect the wallet you will audit with and generate
          your key.
        </p>
        <div className="mt-6">{account ? <Generator account={account} /> : <ConnectButton size="lg" />}</div>
      </main>
    </div>
  );
}
