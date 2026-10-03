import type { Metadata } from "next";
import { Treasury } from "@/components/employer/Treasury";

export const metadata: Metadata = { title: "Treasury" };

export default function TreasuryPage() {
  return <Treasury />;
}
