import type { Metadata } from "next";
import { MyPay } from "@/components/employee/MyPay";

export const metadata: Metadata = { title: "Payslips" };

export default function PayslipsPage() {
  return <MyPay full />;
}
