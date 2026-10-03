import type { Metadata } from "next";
import { SetupWizard } from "@/components/employer/SetupWizard";

export const metadata: Metadata = { title: "Set up your company" };

export default function SetupPage() {
  return <SetupWizard />;
}
