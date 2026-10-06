"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedWalletAccount } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { address as toAddress } from "@solana/kit";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Eye, Lock, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Button, Card, CardBody, Input, Skeleton, Stepper, useToast, type Step } from "@/components/ui";
import { useResource } from "@/hooks/useResource";
import { useSession, useSignIn } from "@/hooks/useSession";
import { useSignerFor } from "@/hooks/useWalletSigner";
import { api } from "@/lib/api/client";
import { getSolanaClient } from "@/lib/solana/rpc";
import { configureConfidentialAccount } from "@/lib/solana/confidential";
import { readHolderState } from "@/lib/solana/accounts";
import { describeError } from "@/lib/errors";
import { shortAddress } from "@/lib/format";

const slide = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

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

function RegisterStep({
  account,
  token,
  companyName,
  mint,
  onDone,
}: {
  account: UiWalletAccount;
  token: string;
  companyName: string;
  mint: string;
  onDone: (already: boolean) => void;
}) {
  const signer = useSignerFor(account);
  const client = useMemo(() => getSolanaClient(), []);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const setStep = (key: string, state: Step["state"], detail?: string) =>
    setSteps((s) => (s ?? []).map((st) => (st.key === key ? { ...st, state, detail: detail ?? st.detail } : st)));

  const run = async () => {
    if (name.trim().length < 1) return setError("Tell them who you are.");
    setError(null);
    setFailed(null);
    setSteps([
      { key: "keys", label: "Derive your private keys", state: "active", detail: "One signature. Keys never leave your wallet." },
      { key: "account", label: "Register your private account", state: "pending", detail: "One transaction with a small rent deposit." },
      { key: "request", label: `Ask ${companyName} to approve you`, state: "pending" },
    ]);
    try {
      const mintAddr = toAddress(mint);
      const existing = await readHolderState(client, toAddress(account.address), mintAddr);
      let signature = "already-configured";
      if (!existing.configured) {
        const r = await configureConfidentialAccount(client, signer, mintAddr);
        signature = r.signature;
        setStep("account", "done", shortAddress(r.token, 6));
      } else {
        setStep("account", "done", "Already registered");
      }
      setStep("keys", "done");
      setStep("request", "active");
      const res = await api.submitClaim(token, { name: name.trim(), note: note.trim(), configuredSignature: signature.padEnd(32, "-") });
      setStep("request", "done");
      onDone(res.alreadyRegistered);
    } catch (e) {
      const d = describeError(e);
      setSteps((s) => (s ?? []).map((st) => (st.state === "active" ? { ...st, state: "error", detail: d.message } : st)));
      setFailed(d.cancelled ? "You cancelled in your wallet. Nothing happened." : d.message);
      if (!d.cancelled) console.error(d.detail);
    }
  };

  if (steps) {
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

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <Input label="Your name" placeholder="How they should see you" value={name} onChange={(e) => setName(e.target.value)} error={error} autoFocus />
      <Input
        label="What is this for"
        labelAside="Optional"
        placeholder="Bounty #42, October invoice, grant milestone 2…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
      />
      <p className="text-[13px] text-ink-3 text-pretty">
        Your wallet will ask for one signature to derive your private keys and one transaction to register your account.
        {companyName} then approves you and sets the amount. You will see it the moment it lands.
      </p>
      <Button type="submit" size="lg" block trailingIcon={<ArrowRight size={16} />}>
        Register to get paid
      </Button>
    </form>
  );
}

export function ClaimFlow({ token }: { token: string }) {
  const router = useRouter();
  const [account] = useSelectedWalletAccount();
  const { state: session, setAuthenticated } = useSession();
  const info = useResource(() => api.claim(token), [token]);
  const [done, setDone] = useState<null | { already: boolean }>(null);

  const authenticated = session.status === "authenticated" && account && session.address === account.address;
  const company = info.data?.company;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4 md:px-6">
        <Wordmark />
        <ConnectButton size="sm" variant="secondary" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        {info.status === "error" ? (
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">This link is not active</h1>
            <p className="mt-2 text-[14px] text-ink-3">{info.error}. Ask whoever shared it for a current one.</p>
          </div>
        ) : !company ? (
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-3 h-4 w-72" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" {...slide}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-green-soft text-green">
                  <Check size={20} strokeWidth={2.5} />
                </div>
                <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">
                  {done.already ? "You are already registered" : "Request sent"}
                </h1>
                <p className="mt-2 text-[14px] text-ink-3 text-pretty">
                  {company.name} will approve you and set the amount. When they pay, it appears in Payslip and only you can
                  read the number.
                </p>
                <Button size="lg" block className="mt-6" trailingIcon={<ArrowRight size={16} />} onClick={() => router.push("/app/me")}>
                  Open my payouts
                </Button>
              </motion.div>
            ) : (
              <motion.div key="claim" {...slide}>
                <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-3">Get paid privately</p>
                <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.01em] text-ink text-balance">
                  {company.name}
                  {company.claimLabel ? ` · ${company.claimLabel}` : ""}
                </h1>
                <p className="mt-2 text-[14px] text-ink-3 text-pretty">
                  Register the wallet you want to be paid to. {company.name} approves you and sets the amount.
                </p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {[
                    { icon: <Lock size={15} />, text: "Paid in USDC. The amount is encrypted on-chain." },
                    { icon: <Eye size={15} />, text: "Only you can see the amount. Not other recipients, not the public." },
                    { icon: <ShieldCheck size={15} />, text: `${company.name}'s auditor can verify totals but cannot touch your money.` },
                  ].map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13.5px] text-ink-2">
                      <span className="mt-0.5 text-ink-3">{r.icon}</span>
                      <span className="text-pretty">{r.text}</span>
                    </li>
                  ))}
                </ul>
                <Card className="mt-6">
                  <CardBody className="pt-5">
                    {!company.mint ? (
                      <p className="text-[14px] text-ink-3">{company.name} has not finished setting up yet. Try again later.</p>
                    ) : !account ? (
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
                      <RegisterStep account={account} token={token} companyName={company.name} mint={company.mint} onDone={(already) => setDone({ already })} />
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
