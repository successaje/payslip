import type { Metadata } from "next";
import { Providers } from "@/components/app/Providers";

export const metadata: Metadata = {
  title: "App",
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <Providers>{children}</Providers>;
}
