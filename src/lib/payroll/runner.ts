"use client";

/**
 * Executes a payroll run from the employer's browser.
 *
 * Each payment is a confidential transfer: proofs are generated locally with
 * the employer's keys, several transactions are sent, and progress is
 * reported to the API after every stage so a refresh or a crash never loses
 * track of who has been paid. Failures are isolated per payment and the run
 * can be resumed; paid payments are never retried.
 */
import { address as toAddress, type Address } from "@solana/kit";
import { api } from "@/lib/api/client";
import type { Payment, PaymentStatus } from "@/lib/db/schema";
import { paymentsToAttempt } from "@/lib/domain/payroll";
import { confidentialTransfer } from "@/lib/solana/confidential";
import { confidentialTransferV1 } from "@/lib/solana/confidentialV1";
import type { SolanaClient } from "@/lib/solana/rpc";
import type { WalletSigner } from "@/lib/solana/signers";
import { describeError } from "@/lib/errors";

export type RunnerPayment = Payment & { employee: { id: string; name: string; walletAddress: string | null } };

export interface RunnerEvent {
  paymentId: string;
  status: PaymentStatus;
  detail?: string;
  signature?: string;
  error?: string;
}

export interface RunnerInput {
  companyId: string;
  runId: string;
  mint: Address;
  auditorElgamalPubkey: Address | null;
  payments: RunnerPayment[];
  client: SolanaClient;
  signer: WalletSigner;
  onEvent: (e: RunnerEvent) => void;
  /** Returns true when the user asked to stop after the current payment. */
  shouldStop?: () => boolean;
}

export interface RunnerResult {
  paid: number;
  failed: number;
  stopped: boolean;
}

export async function runPayroll(input: RunnerInput): Promise<RunnerResult> {
  const { companyId, runId, mint, auditorElgamalPubkey, client, signer, onEvent } = input;
  let paid = 0;
  let failed = 0;
  let stopped = false;

  const report = async (p: RunnerPayment, status: PaymentStatus, extra: Partial<RunnerEvent> & { signatures?: string[] } = {}) => {
    onEvent({ paymentId: p.id, status, detail: extra.detail, signature: extra.signature, error: extra.error });
    try {
      await api.updatePayment(companyId, runId, p.id, {
        status,
        signature: extra.signature,
        signatures: extra.signatures ? JSON.stringify(extra.signatures) : undefined,
        error: extra.error ?? null,
      });
    } catch (e) {
      // The chain is the source of truth; a bookkeeping failure must not stop payroll.
      console.warn("Could not record payment status", e);
    }
  };

  for (const p of paymentsToAttempt(input.payments)) {
    if (input.shouldStop?.()) {
      stopped = true;
      break;
    }
    if (!p.employee.walletAddress) {
      failed++;
      await report(p, "failed", { error: "This person has not connected a wallet" });
      continue;
    }
    try {
      await report(p, "preparing", { detail: "Generating proofs" });
      let signature: string;
      let signatures: string[];
      let detail = "Paid";
      try {
        // One atomic Transaction V1: three inline proof verifications and the transfer.
        const v1 = await confidentialTransferV1(client, signer, mint, toAddress(p.employee.walletAddress), BigInt(p.amount), auditorElgamalPubkey);
        signature = v1.signature;
        signatures = [v1.signature];
        detail = `Paid in one transaction (${(v1.bytes / 1024).toFixed(1)} KB)`;
      } catch (e) {
        const d = describeError(e);
        if (d.cancelled) throw e;
        // Fall back to the multi-transaction path (proof context accounts).
        console.warn("V1 transfer failed, falling back to multi-transaction transfer", d.detail);
        await report(p, "preparing", { detail: "Retrying with standard transactions" });
        const result = await confidentialTransfer(client, signer, mint, toAddress(p.employee.walletAddress), BigInt(p.amount), auditorElgamalPubkey);
        signature = result.signature;
        signatures = result.signatures;
      }
      paid++;
      await report(p, "paid", { signature, signatures, detail });
    } catch (e) {
      failed++;
      const d = describeError(e);
      if (!d.cancelled) console.error(d.detail);
      await report(p, "failed", { error: d.cancelled ? "Cancelled in wallet" : d.message });
      if (d.cancelled) {
        stopped = true;
        break;
      }
    }
  }

  return { paid, failed, stopped };
}
