import type { Metadata } from "next";
import { RunDetail } from "@/components/employer/RunDetail";

export const metadata: Metadata = { title: "Payroll run" };

export default async function RunPage({ params }: PageProps<"/app/payroll/[runId]">) {
  const { runId } = await params;
  return <RunDetail runId={runId} />;
}
