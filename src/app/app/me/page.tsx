import type { Metadata } from "next";
import { MyPay } from "@/components/employee/MyPay";

export const metadata: Metadata = { title: "My pay" };

export default function MyPayPage() {
  return <MyPay />;
}
