"use client";

import type { Company, Employee, Payment, PayrollRun } from "@/lib/db/schema";

/** Typed fetch helpers for the app's own API. Throws with the server's message. */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Me {
  address: string;
  companies: Company[];
  memberships: { employee: Employee; company: { id: string; name: string; mint: string | null } }[];
  /** Companies this wallet is the designated auditor of. */
  audits: { id: string; name: string; mint: string | null; ownerAddress: string }[];
  /** Self-registrations awaiting the payer's approval. */
  requests: { id: string; name: string; note: string | null; company: { id: string; name: string } }[];
}

export interface AuditRow {
  paymentId: string;
  period: string;
  employeeName: string;
  employeeWallet: string | null;
  recordedAmount: string;
  signature: string;
  paidAt: string | null;
}

export interface AuditData {
  company: { id: string; name: string; mint: string | null; auditorAddress: string; auditorElgamalPubkey: string | null };
  rows: AuditRow[];
}

export const api = {
  me: () => request<Me>("/api/me"),

  createCompany: (body: { name: string; auditorAddress: string }) =>
    request<Company>("/api/companies", { method: "POST", body: JSON.stringify(body) }),

  getCompany: (id: string) => request<Company>(`/api/companies/${id}`),

  updateCompany: (id: string, body: Partial<Pick<Company, "name" | "mint" | "auditorElgamalPubkey" | "mintSignature">>) =>
    request<Company>(`/api/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listEmployees: (companyId: string) => request<Employee[]>(`/api/companies/${companyId}/employees`),

  createEmployee: (companyId: string, body: { name: string; email?: string; role?: string; amount: string }) =>
    request<Employee>(`/api/companies/${companyId}/employees`, { method: "POST", body: JSON.stringify(body) }),

  updateClaimLink: (companyId: string, body: { enabled: boolean; label?: string; rotate?: boolean }) =>
    request<Company>(`/api/companies/${companyId}/claim-link`, { method: "PATCH", body: JSON.stringify(body) }),

  claim: (token: string) => request<{ company: { name: string; mint: string | null; claimLabel: string | null } }>(`/api/claim/${token}`),

  submitClaim: (token: string, body: { name: string; note?: string; configuredSignature: string }) =>
    request<{ employee: Employee; alreadyRegistered: boolean }>(`/api/claim/${token}`, { method: "POST", body: JSON.stringify(body) }),

  updateEmployee: (companyId: string, id: string, body: Partial<Pick<Employee, "name" | "email" | "role" | "amount" | "status">>) =>
    request<Employee>(`/api/companies/${companyId}/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listRuns: (companyId: string) => request<PayrollRun[]>(`/api/companies/${companyId}/runs`),

  createRun: (companyId: string, body: { period: string; employeeIds: string[] }) =>
    request<{ run: PayrollRun; payments: Payment[] }>(`/api/companies/${companyId}/runs`, { method: "POST", body: JSON.stringify(body) }),

  getRun: (companyId: string, runId: string) =>
    request<{ run: PayrollRun; payments: (Payment & { employee: Pick<Employee, "id" | "name" | "walletAddress" | "role"> })[] }>(
      `/api/companies/${companyId}/runs/${runId}`,
    ),

  updatePayment: (companyId: string, runId: string, paymentId: string, body: Partial<Pick<Payment, "status" | "signature" | "signatures" | "error">>) =>
    request<Payment>(`/api/companies/${companyId}/runs/${runId}/payments/${paymentId}`, { method: "PATCH", body: JSON.stringify(body) }),

  invite: (token: string) =>
    request<{ employee: Pick<Employee, "id" | "name" | "role" | "status" | "walletAddress">; company: { name: string; mint: string | null; auditorElgamalPubkey: string | null } }>(
      `/api/invites/${token}`,
    ),

  acceptInvite: (token: string, body: { configuredSignature: string }) =>
    request<Employee>(`/api/invites/${token}`, { method: "POST", body: JSON.stringify(body) }),

  audit: (companyId: string) => request<AuditData>(`/api/companies/${companyId}/audit`),

  myPayslips: () =>
    request<{ company: { id: string; name: string; mint: string | null }; employee: Employee; payments: (Payment & { period: string })[] }[]>(
      "/api/me/payslips",
    ),
};
