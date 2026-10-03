"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { address as toAddress } from "@solana/kit";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Wordmark } from "@/components/brand/Wordmark";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Button, Card, CardBody, Input, Stepper, useToast, type Step } from "@/components/ui";
import { api } from "@/lib/api/client";
import { auditorPublicKey, configureConfidentialAccount } from "@/lib/solana/confidential";
import { createCompanyMint } from "@/lib/solana/mint";
import { findVaultAuthority, getInitVaultInstruction } from "@/lib/solana/vault";
import { sendInstructions } from "@/lib/solana/send";
import { VAULT_PROGRAM_ID } from "@/lib/solana/config";
import { generateKeyPairSigner } from "@solana/kit";
import { describeError } from "@/lib/errors";
import { explorerUrl } from "@/lib/solana/config";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/cn";

type Phase = "details" | "auditor" | "create" | "done";

const slide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

export function SetupWizard() {
  const { account, signer, client, refresh, signOut } = useApp();
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("details");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [auditorMode, setAuditorMode] = useState<"self" | "other">("self");
  const [auditorAddress, setAuditorAddress] = useState("");
  const [auditorKey, setAuditorKey] = useState("");
  const [auditorError, setAuditorError] = useState<string | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<{ mint: string; signature: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const setStep = (key: string, state: Step["state"], detail?: string) =>
    setSteps((s) => s.map((st) => (st.key === key ? { ...st, state, detail: detail ?? st.detail } : st)));

  async function runCreate() {
    setPhase("create");
    setFailed(null);
    setSteps([
      { key: "company", label: "Save company", state: "active" },
      { key: "auditor", label: "Derive auditor key", state: "pending", detail: auditorMode === "self" ? "One signature from your wallet" : undefined },
      { key: "mint", label: "Create payroll token", state: "pending", detail: "One transaction. Pays a small rent deposit." },
      ...(VAULT_PROGRAM_ID
        ? [{ key: "vault", label: "Open the USDC vault", state: "pending" as const, detail: "One transaction. Backs the token 1:1 with USDC." }]
        : []),
      { key: "treasury", label: "Prepare your treasury account", state: "pending", detail: "One transaction so you can hold a private balance." },
      { key: "record", label: "Record on Payslip", state: "pending" },
    ]);

    try {
      const company = await api.createCompany({
        name,
        auditorAddress: auditorMode === "self" ? account.address : auditorAddress,
      });
      setStep("company", "done");

      setStep("auditor", "active");
      let auditorElgamalPubkey: string;
      if (auditorMode === "self") {
        auditorElgamalPubkey = await auditorPublicKey(signer);
      } else {
        auditorElgamalPubkey = toAddress(auditorKey.trim());
      }
      setStep("auditor", "done", shortAddress(auditorElgamalPubkey, 6));

      setStep("mint", "active", "Preparing…");
      // With the vault program deployed, the vault PDA is the only mint authority.
      const mintKeypair = await generateKeyPairSigner();
      const mintAuthority = VAULT_PROGRAM_ID ? await findVaultAuthority(mintKeypair.address) : toAddress(account.address);
      const { mint, signature } = await createCompanyMint(
        {
          client,
          payer: signer,
          mint: mintKeypair,
          mintAuthority,
          auditorElgamalPubkey: toAddress(auditorElgamalPubkey),
        },
        {
          onStage: (stage) =>
            setStep(
              "mint",
              "active",
              stage === "signing" ? "Waiting for your signature…" : stage === "confirming" ? "Confirming on Solana…" : "Preparing…",
            ),
        },
      );
      setStep("mint", "done", shortAddress(mint, 6));

      if (VAULT_PROGRAM_ID) {
        setStep("vault", "active", "Waiting for your signature…");
        await sendInstructions(client, signer, [await getInitVaultInstruction(signer, toAddress(mint))]);
        setStep("vault", "done");
      }

      setStep("treasury", "active", "Waiting for your signature…");
      await configureConfidentialAccount(client, signer, toAddress(mint));
      setStep("treasury", "done");

      setStep("record", "active");
      await api.updateCompany(company.id, { mint, auditorElgamalPubkey, mintSignature: signature });
      setStep("record", "done");
      setResult({ mint, signature });
      setPhase("done");
    } catch (e) {
      const d = describeError(e);
      setSteps((s) => s.map((st) => (st.state === "active" ? { ...st, state: "error", detail: d.message } : st)));
      setFailed(d.cancelled ? "You cancelled in your wallet. Nothing was created on-chain." : d.message);
      if (!d.cancelled) console.error(d.detail);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4 md:px-6">
        <Wordmark />
        <ConnectButton size="sm" variant="secondary" onSignOut={signOut} />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <ol className="mb-6 flex items-center gap-2 text-[12px] text-ink-3">
          {(["details", "auditor", "create"] as Phase[]).map((p, i) => {
            const order = ["details", "auditor", "create", "done"];
            const done = order.indexOf(phase) > i;
            const active = phase === p;
            return (
              <li key={p} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                    done ? "border-green bg-green text-white" : active ? "border-ink text-ink" : "border-line-strong",
                  )}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn(active && "text-ink font-medium")}>
                  {p === "details" ? "Company" : p === "auditor" ? "Auditor" : "Create"}
                </span>
                {i < 2 && <span className="mx-1 h-px w-6 bg-line" />}
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait">
          {phase === "details" && (
            <motion.div key="details" {...slide}>
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Name your company</h1>
              <p className="mt-2 text-[14px] text-ink-3 text-pretty">
                This is what your team will see on their invite and payslips.
              </p>
              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim().length < 2) return setNameError("Give the company a name");
                  setNameError(null);
                  setPhase("auditor");
                }}
              >
                <Input
                  label="Company name"
                  placeholder="Northwind Studio"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={nameError}
                  maxLength={80}
                />
                <Button type="submit" size="lg" trailingIcon={<ArrowRight size={16} />}>
                  Continue
                </Button>
              </form>
            </motion.div>
          )}

          {phase === "auditor" && (
            <motion.div key="auditor" {...slide}>
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Who can audit payroll?</h1>
              <p className="mt-2 text-[14px] text-ink-3 text-pretty">
                The auditor can read every salary amount on-chain but cannot move a cent. This is baked into the payroll
                token when it is created and cannot be changed later.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setAuditorMode("self")}
                  className={cn(
                    "rounded-[var(--radius-md)] border p-3.5 text-left transition-colors",
                    auditorMode === "self" ? "border-ink bg-paper-raised" : "border-line hover:bg-paper-sunken",
                  )}
                >
                  <p className="text-[14px] font-medium text-ink">Me, for now</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    Your wallet {shortAddress(account.address)} holds the auditor key. Good for getting started.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAuditorMode("other")}
                  className={cn(
                    "rounded-[var(--radius-md)] border p-3.5 text-left transition-colors",
                    auditorMode === "other" ? "border-ink bg-paper-raised" : "border-line hover:bg-paper-sunken",
                  )}
                >
                  <p className="text-[14px] font-medium text-ink">Someone else</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">Your accountant or finance lead. They generate a key and send it to you.</p>
                </button>
              </div>

              {auditorMode === "other" && (
                <div className="mt-4 flex flex-col gap-3">
                  <Input
                    label="Auditor wallet address"
                    mono
                    placeholder="Their Solana address"
                    value={auditorAddress}
                    onChange={(e) => setAuditorAddress(e.target.value)}
                  />
                  <Input
                    label="Auditor key"
                    mono
                    placeholder="Key they generated on Payslip"
                    value={auditorKey}
                    onChange={(e) => setAuditorKey(e.target.value)}
                    hint={
                      <span>
                        They get it at{" "}
                        <a href="/auditor-key" target="_blank" className="inline-flex items-center gap-0.5 text-ink underline underline-offset-2">
                          payslip/auditor-key <ExternalLink size={11} />
                        </a>{" "}
                        with one signature.
                      </span>
                    }
                  />
                </div>
              )}
              {auditorError && (
                <p role="alert" className="mt-3 text-[13px] text-red">
                  {auditorError}
                </p>
              )}
              <div className="mt-6 flex gap-2">
                <Button variant="secondary" size="lg" onClick={() => setPhase("details")}>
                  Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  trailingIcon={<ArrowRight size={16} />}
                  onClick={() => {
                    if (auditorMode === "other") {
                      try {
                        toAddress(auditorAddress.trim());
                      } catch {
                        return setAuditorError("Enter a valid Solana address for the auditor.");
                      }
                      try {
                        toAddress(auditorKey.trim());
                      } catch {
                        return setAuditorError("The auditor key does not look right. Ask them to copy it again.");
                      }
                    }
                    setAuditorError(null);
                    void runCreate();
                  }}
                >
                  Create payroll token
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "create" && (
            <motion.div key="create" {...slide}>
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Creating {name}</h1>
              <p className="mt-2 text-[14px] text-ink-3 text-pretty">
                Your wallet will ask for one signature and two transactions. Keep this tab open.
              </p>
              <Card className="mt-6">
                <CardBody className="pt-5">
                  <Stepper steps={steps} />
                </CardBody>
              </Card>
              {failed && (
                <div className="mt-4 rounded-[var(--radius-md)] border border-red/30 bg-red-soft p-3.5">
                  <p className="text-[13.5px] font-medium text-red">{failed}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setPhase("auditor")}>
                      Back
                    </Button>
                    <Button size="sm" onClick={runCreate}>
                      Try again
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {phase === "done" && result && (
            <motion.div key="done" {...slide}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-green-soft text-green">
                <Check size={20} strokeWidth={2.5} />
              </div>
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">{name} is ready</h1>
              <p className="mt-2 text-[14px] text-ink-3 text-pretty">
                Your payroll token exists on Solana with the auditor key set. Next, add the people you pay.
              </p>
              <a
                href={explorerUrl("tx", result.signature)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[13px] text-ink-2 underline underline-offset-2"
              >
                View creation on explorer <ExternalLink size={12} />
              </a>
              <Button
                size="lg"
                block
                className="mt-6"
                trailingIcon={<ArrowRight size={16} />}
                onClick={async () => {
                  toast({ tone: "success", title: "Company created", description: "Add people to start paying privately." });
                  await refresh();
                  router.push("/app/people");
                }}
              >
                Add people
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
