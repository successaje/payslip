import type { Metadata } from "next";
import { Overview } from "@/components/employer/Overview";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return <Overview />;
}
