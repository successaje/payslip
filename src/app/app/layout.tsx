import type { Metadata } from "next";
import { Providers } from "@/components/app/Providers";
import { AppGate } from "@/components/app/AppGate";

export const metadata: Metadata = {
  title: "App",
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Providers>
      <AppGate>{children}</AppGate>
    </Providers>
  );
}
