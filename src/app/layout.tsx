import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ThemeScript } from "@/components/theme/ThemeScript";
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
  title: {
    default: "Payslip",
    template: "%s · Payslip",
  },
  description:
    "Private stablecoin payroll on Solana. Salaries hidden on-chain, visible to the employee and the auditor.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeScript />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
