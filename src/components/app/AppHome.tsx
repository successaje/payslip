"use client";

import { useState } from "react";
import { useSelectedWalletAccount } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { Home, Users, Receipt, Landmark, ShieldCheck, Settings } from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { Button, Card, CardBody, useToast } from "@/components/ui";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Mark } from "@/components/brand/Wordmark";
import { useSession, useSignIn } from "@/hooks/useSession";
import { describeError } from "@/lib/errors";
import { shortAddress } from "@/lib/format";

export const employerNav: NavItem[] = [
  { href: "/app", label: "Overview", icon: <Home size={17} /> },
  { href: "/app/people", label: "People", icon: <Users size={17} /> },
  { href: "/app/payroll", label: "Payroll", icon: <Receipt size={17} /> },
  { href: "/app/treasury", label: "Treasury", icon: <Landmark size={17} /> },
  { href: "/app/audit", label: "Audit", icon: <ShieldCheck size={17} /> },
  { href: "/app/settings", label: "Settings", icon: <Settings size={17} /> },
];

function SignInCard({ account, onDone }: { account: UiWalletAccount; onDone: (address: string) => void }) {
  const signIn = useSignIn(account);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return (
    <Card className="w-full max-w-md">
      <CardBody className="pt-5">
        <p className="text-[13px] text-ink-3">Connected as</p>
        <p className="font-mono text-[14px] text-ink">{shortAddress(account.address, 6)}</p>
        <p className="mt-4 text-[14px] text-ink-2 text-pretty">
          Sign one message to prove you own this wallet. It costs nothing and does not move funds.
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
              onDone(await signIn());
            } catch (e) {
              const d = describeError(e);
              if (!d.cancelled) toast({ tone: "error", title: "Sign-in failed", description: d.message });
            } finally {
              setBusy(false);
            }
          }}
        >
          Sign in
        </Button>
      </CardBody>
    </Card>
  );
}

/**
 * Entry to the product. Three states: no wallet, wallet but no session,
 * authenticated. The authenticated state is a placeholder until the company
 * overview lands.
 */
export function AppHome() {
  const [account] = useSelectedWalletAccount();
  const { state, signOut, setAuthenticated } = useSession();

  const authenticated = state.status === "authenticated" && account && state.address === account.address;

  if (!authenticated) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
        <Mark size={40} className="mb-6" />
        <h1 className="text-center text-[24px] font-semibold tracking-[-0.01em] text-ink">
          {account ? "Welcome back" : "Sign in to Payslip"}
        </h1>
        <p className="mb-8 mt-2 max-w-[40ch] text-center text-[14.5px] text-ink-3 text-pretty">
          {account
            ? "One signature and you are in."
            : "Connect the wallet you pay from. Employees connect the wallet they get paid to."}
        </p>
        {account ? (
          state.status === "loading" ? null : (
            <SignInCard account={account} onDone={setAuthenticated} />
          )
        ) : (
          <ConnectButton size="lg" />
        )}
      </div>
    );
  }

  return (
    <AppShell nav={employerNav} onSignOut={signOut}>
      <h1 className="text-[22px] font-semibold text-ink">Overview</h1>
      <p className="mt-1 text-[14px] text-ink-3">Signed in as {shortAddress(state.address, 6)}.</p>
    </AppShell>
  );
}
