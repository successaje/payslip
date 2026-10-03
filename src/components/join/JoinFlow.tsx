"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedWalletAccount } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { address as toAddress } from "@solana/kit";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Lock, ShieldCheck, Eye } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Button, Card, CardBody, Skeleton, Stepper, useToast, type Step } from "@/components/ui";
import { useSession, useSignIn } from "@/hooks/useSession";
import { useSignerFor } from "@/hooks/useWalletSigner";
import { api } from "@/lib/api/client";
import { getSolanaClient } from "@/lib/solana/rpc";
import { configureConfidentialAccount } from "@/lib/solana/confidential";
import { describeError } from "@/lib/errors";
import { shortAddress } from "@/lib/format";

type Invite = Awaited<ReturnType<typeof api.invite>>;

const slide = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

function Explainer({ company }: { company: string }) {
  const rows = [
    { icon: <Lock size={15} />, text: `${company} pays you in USDC. The amount is encrypted on-chain.` },
    { icon: <Eye size={15} />, text: "Only you can see your pay. Not your colleagues, not the public." },
    { icon: <ShieldCheck size={15} />, text: `${company}'s auditor can verify totals but cannot touch your money.` },
  ];
  return (
    <ul className="mt-5 flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <li key={i} className="flex items-start gap-3 text-[13.5px] text-ink-2">
          <span className="mt-0.5 text-ink-3">{r.icon}</span>
          <span className="text-pretty">{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

function SignInStep({ account, onDone }: { account: UiWalletAccount; onDone: (a: string) => void }) {
  const signIn = useSignIn(account);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      block
      size="lg"
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
      Sign in with {shortAddress(account.address)}
    </Button>
  );
}

function SetupStep({ account, token, invite, onDone }: { account: UiWalletAccount; token: string; invite: Invite; onDone: () => void }) {
  const signer = useSignerFor(account);
  const client = useMemo(() => getSolanaClient(), []);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const setStep = (key: string, state: Step["state"], detail?: string) =>
    setSteps((s) => (s ?? []).map((st) => (st.key === key ? { ...st, state, detail: detail ?? st.detail } : st)));

  const run = async () => {
    setFailed(null);
    setSteps([
      { key: "keys", label: "Derive your private keys", state: "active", detail: "One signature. Keys never leave your wallet." },
      { key: "account", label: "Register your private account", state: "pending", detail: "One transaction with a small rent deposit." },
      { key: "link", label: "Link to your invite", state: "pending" },
    ]);
    try {
      if (!invite.company.mint) throw new Error("The company has not finished setup yet. Ask them to try again.");
      const r = await configureConfidentialAccount(client, signer, toAddress(invite.company.mint));
      setStep("keys", "done");
      setStep("account", "done", shortAddress(r.token, 6));
      setStep("link", "active");
      await api.acceptInvite(token, { configuredSignature: r.signature });
      setStep("link", "done");
      onDone();
    } catch (e) {
      const d = describeError(e);
      setSteps((s) => (s ?? []).map((st) => (st.state === "active" ? { ...st, state: "error", detail: d.message } : st)));
      setFailed(d.cancelled ? "You cancelled in your wallet. Nothing happened." : d.message);
      if (!d.cancelled) console.error(d.detail);
    }
  };

  if (!steps) {
    return (
      <>
        <p className="text-[14px] text-ink-2 text-pretty">
          Your wallet will ask for one signature to derive your private keys, then one transaction to register your
          account for {invite.company.name}&apos;s payroll.
        </p>
        <Button block size="lg" className="mt-5" trailingIcon={<ArrowRight size={16} />} onClick={run}>
          Set up my private account
        </Button>
      </>
    );
  }

  return (
    <>
      <Stepper steps={steps} />
      {failed && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-red/30 bg-red-soft p-3.5">
          <p className="text-[13.5px] font-medium text-red">{failed}</p>
          <Button size="sm" className="mt-3" onClick={run}>
            Try again
          </Button>
        </div>
      )}
    </>
  );
}

export function JoinFlow({ token }: { token: string }) {
  const router = useRouter();
  const [account] = useSelectedWalletAccount();
  const { state: session, setAuthenticated } = useSession();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.invite(token).then(setInvite).catch((e) => setError(e instanceof Error ? e.message : "Invalid invite"));
  }, [token]);

  const authenticated = session.status === "authenticated" && account && session.address === account.address;
  const alreadyAccepted = invite?.employee.status === "active";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4 md:px-6">
        <Wordmark />
        <ConnectButton size="sm" variant="secondary" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        {error ? (
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">This link doesn&apos;t work</h1>
            <p className="mt-2 text-[14px] text-ink-3">{error}. Ask whoever sent it for a new one.</p>
          </div>
        ) : !invite ? (
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-3 h-4 w-72" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {done || alreadyAccepted ? (
              <motion.div key="done" {...slide}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-green-soft text-green">
                  <Check size={20} strokeWidth={2.5} />
                </div>
                <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">You&apos;re set up</h1>
                <p className="mt-2 text-[14px] text-ink-3 text-pretty">
                  {invite.company.name} can now pay you privately. Your pay will appear in Payslip, and only you can read
                  the amount.
                </p>
                <Button size="lg" block className="mt-6" trailingIcon={<ArrowRight size={16} />} onClick={() => router.push("/app/me")}>
                  Open my pay
                </Button>
              </motion.div>
            ) : (
              <motion.div key="invite" {...slide}>
                <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-3">You&apos;re invited</p>
                <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.01em] text-ink text-balance">
                  {invite.company.name} wants to pay you privately
                </h1>
                <p className="mt-2 text-[14px] text-ink-3">
                  Hi {invite.employee.name.split(" ")[0]}. This takes about a minute.
                </p>
                <Explainer company={invite.company.name} />
                <Card className="mt-6">
                  <CardBody className="pt-5">
                    {!account ? (
                      <>
                        <p className="text-[14px] text-ink-2 text-pretty">Connect the wallet you want to be paid to.</p>
                        <div className="mt-4">
                          <ConnectButton size="lg" block />
                        </div>
                      </>
                    ) : !authenticated ? (
                      session.status === "loading" ? (
                        <Skeleton className="h-12 w-full" />
                      ) : (
                        <SignInStep account={account} onDone={setAuthenticated} />
                      )
                    ) : (
                      <SetupStep account={account} token={token} invite={invite} onDone={() => setDone(true)} />
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
