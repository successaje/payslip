import type { Metadata } from "next";
import { AuditEntry } from "@/components/auditor/AuditEntry";

export const metadata: Metadata = { title: "Audit" };

export default function AuditPage() {
  return <AuditEntry />;
}
