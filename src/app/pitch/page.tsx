import type { Metadata } from "next";
import { PitchPlayer } from "@/components/pitch/PitchPlayer";

export const metadata: Metadata = {
  title: "Pitch",
  description: "Animated backdrop for the Payslip pitch video.",
  robots: { index: false, follow: false },
};

export default function PitchPage() {
  return <PitchPlayer />;
}
