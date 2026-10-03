"use client";

import { useApp } from "@/components/app/AppContext";
import { EmptyState } from "@/components/ui";
import { Audit } from "./Audit";

/** Picks which company to audit: the one you own, else the one you audit. */
export function AuditEntry() {
  const { company, me } = useApp();
  const target = company?.id ?? me.audits[0]?.id;
  if (!target) {
    return <EmptyState title="Nothing to audit" description="You are not the auditor of any company yet." />;
  }
  return <Audit companyId={target} />;
}
