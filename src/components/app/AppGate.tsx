"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelectedWalletAccount } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { Home, Users, Receipt, Landmark, ShieldCheck, Settings, Wallet as WalletIcon, FileText } from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { AppContext } from "./AppContext";
import { Button, Card, CardBody, Skeleton, useToast } from "@/components/ui";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Mark } from "@/components/brand/Wordmark";
import { useSession, useSignIn } from "@/hooks/useSession";
import { useMe } from "@/hooks/useMe";
import { useSignerFor } from "@/hooks/useWalletSigner";
import { getSolanaClient } from "@/lib/solana/rpc";
import { describeError } from "@/lib/errors";
import { shortAddress } from "@/lib/format";

const employerNav: NavItem[] = [
  { href: "/app", label: "Overview", icon: <Home size={17} /> },
  { href: "/app/people", label: "People", icon: <Users size={17} /> },
  { href: "/app/payroll", label: "Payroll", icon: <Receipt size={17} /> },
  { href: "/app/treasury", label: "Treasury", icon: <Landmark size={17} /> },
  { href: "/app/audit", label: "Audit", icon: <ShieldCheck size={17} /> },
  { href: "/app/settings", label: "Settings", icon: <Settings size={17} /> },
];

const employeeNav: NavItem[] = [
  { href: "/app/me", label: "My pay", icon: <WalletIcon size={17} /> },
  { href: "/app/me/payslips", label: "Payslips", icon: <FileText size={17} /> },
];

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">{children}</div>;
}

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

/** Everything after wallet + session: loads the account, builds the signer, routes by role. */
function Authenticated({ account, signOut, children }: { account: UiWalletAccount; signOut: () => Promise<void>; children: ReactNode }) {
  const { state, refresh } = useMe(true);
  const signer = useSignerFor(account);
  const client = useMemo(() => getSolanaClient(), []);
  const pathname = usePathname();
  const router = useRouter();

  const me = state.status === "ready" ? state.me : null;
  const company = me?.companies[0] ?? null;
  const isEmployer = Boolean(company);
  const isEmployee = (me?.memberships.length ?? 0) > 0;
  const needsSetup = me !== null && !isEmployer && !isEmployee;
  const onSetup = pathname.startsWith("/app/setup");
  const onEmployeeArea = pathname.startsWith("/app/me");

  useEffect(() => {
    if (!me) return;
    if (needsSetup && !onSetup) router.replace("/app/setup");
    else if (!needsSetup && onSetup) router.replace(isEmployer ? "/app" : "/app/me");
    else if (!isEmployer && isEmployee && !onEmployeeArea) router.replace("/app/me");
  }, [me, needsSetup, onSetup, isEmployer, isEmployee, onEmployeeArea, router]);

  if (state.status === "error") {
    return (
      <Centered>
        <p className="text-[15px] font-medium text-ink">Could not load your account</p>
        <p className="mt-1 text-[13.5px] text-ink-3">{state.message}</p>
        <Button className="mt-4" variant="secondary" onClick={refresh}>
          Try again
        </Button>
      </Centered>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto w-full max-w-[1040px] px-4 py-8 md:px-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-72" />
        <Skeleton className="mt-8 h-40 w-full" />
      </div>
    );
  }

  const value = { account, signer, client, me, company, refresh, signOut };

  if (needsSetup || onSetup) {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
  }

  const nav = isEmployer && !onEmployeeArea ? employerNav : employeeNav;
  const context = isEmployer && !onEmployeeArea ? company?.name : me.memberships[0]?.company.name;

  return (
    <AppContext.Provider value={value}>
      <AppShell nav={nav} context={context} onSignOut={signOut}>
        {children}
      </AppShell>
    </AppContext.Provider>
  );
}

export function AppGate({ children }: { children: ReactNode }) {
  const [account] = useSelectedWalletAccount();
  const { state, signOut, setAuthenticated } = useSession();

  const authenticated = state.status === "authenticated" && account && state.address === account.address;

  if (authenticated) {
    return (
      <Authenticated account={account} signOut={signOut}>
        {children}
      </Authenticated>
    );
  }

  return (
    <Centered>
      <Mark size={40} className="mb-6" />
      <h1 className="text-center text-[24px] font-semibold tracking-[-0.01em] text-ink">
        {account ? "Welcome back" : "Sign in to Payslip"}
      </h1>
      <p className="mb-8 mt-2 max-w-[40ch] text-center text-[14.5px] text-ink-3 text-pretty">
        {account ? "One signature and you are in." : "Connect the wallet you pay from. Employees connect the wallet they get paid to."}
      </p>
      {account ? (
        state.status === "loading" ? null : <SignInCard account={account} onDone={setAuthenticated} />
      ) : (
        <ConnectButton size="lg" />
      )}
    </Centered>
  );
}
