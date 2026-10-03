import type { Metadata } from "next";
import { Settings } from "@/components/employer/Settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <Settings />;
}
