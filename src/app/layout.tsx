import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3200"),
  title: {
    default: "Payslip · Private USDC payouts on Solana",
    template: "%s · Payslip",
  },
  openGraph: {
    title: "Payslip · Private USDC payouts on Solana",
    description: "Salaries, invoices, grants and bounties with amounts encrypted on-chain. Readable only by the recipient and the auditor.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  description:
    "Private USDC payouts on Solana. Salaries, invoices, grants and bounties with amounts encrypted on-chain, visible only to the recipient and the auditor.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Theme is a cookie so the server renders the right tokens: no flash, no inline script.
  const stored = (await cookies()).get("payslip.theme")?.value;
  const theme = stored === "dark" || stored === "light" ? stored : undefined;
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
