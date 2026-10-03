import type { Metadata } from "next";
import { Payroll } from "@/components/employer/Payroll";

export const metadata: Metadata = { title: "Payroll" };

export default function PayrollPage() {
  return <Payroll />;
}
