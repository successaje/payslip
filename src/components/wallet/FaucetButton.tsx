"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { Button, useToast, type ButtonProps } from "@/components/ui";
import { api } from "@/lib/api/client";
import { CLUSTER } from "@/lib/solana/config";
import { formatUsd } from "@/lib/domain/money";

/**
 * Devnet only. Gives the signed-in wallet a little SOL and test USDC so a
 * first-time visitor can run the whole flow without leaving the site.
 */
export function FaucetButton({ onFunded, children = "Get devnet test funds", ...props }: { onFunded?: () => void; children?: React.ReactNode } & Omit<ButtonProps, "onClick" | "children">) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  if (CLUSTER !== "devnet") return null;
  return (
    <Button
      variant="secondary"
      leadingIcon={<Droplets size={14} />}
      loading={busy}
      loadingLabel="Sending…"
      {...props}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api.devnetFaucet();
          const sol = Number(r.granted.sol) / 1e9;
          const usdc = BigInt(r.granted.usdc);
          toast({
            tone: "success",
            title: r.signature ? "Test funds sent" : "Already funded",
            description: r.signature ? `${sol > 0 ? `${sol} SOL` : ""}${sol > 0 && usdc > 0n ? " and " : ""}${usdc > 0n ? `${formatUsd(usdc)} test USDC` : ""} on devnet.` : "This wallet already has enough SOL and test USDC.",
          });
          onFunded?.();
        } catch (e) {
          toast({ tone: "error", title: "Could not send test funds", description: e instanceof Error ? e.message : undefined });
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </Button>
  );
}
