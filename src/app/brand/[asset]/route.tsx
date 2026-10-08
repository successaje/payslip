import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { ReactElement } from "react";

export const runtime = "nodejs";

/**
 * Brand assets rendered from the same tokens the product uses, so the logo,
 * social cards and video cover never drift from the app. Each asset is a PNG:
 *
 *   /brand/wordmark-light   transparent, ink on nothing      1200x320
 *   /brand/wordmark-dark    transparent, paper on nothing    1200x320
 *   /brand/logo-square      mark, name, tagline              1024x1024
 *   /brand/banner           X / Twitter header               1500x500
 *   /brand/cover            16:9 title card for the videos   1920x1080
 *   /brand/og               same as the site's OG image      1200x630
 */
const INK = "#171614";
const PAPER = "#f7f6f2";
const INK_2 = "#4d4a44";
const GREEN = "#0f6b4f";

const ASSETS = {
  "wordmark-light": { width: 1200, height: 320 },
  "wordmark-dark": { width: 1200, height: 320 },
  "logo-square": { width: 1024, height: 1024 },
  banner: { width: 1500, height: 500 },
  cover: { width: 1920, height: 1080 },
  og: { width: 1200, height: 630 },
} as const;
type Asset = keyof typeof ASSETS;

async function googleFont(family: string, weight: number, text?: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  // An old user agent makes Google serve TTF, or WOFF, which the renderer can read (it cannot read woff2).
  const css = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0" } }).then((r) => r.text());
  const src = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype|woff)'\)/)?.[1];
  if (!src) throw new Error(`No TTF for ${family}`);
  return fetch(src).then((r) => r.arrayBuffer());
}

function Mark({ size, ink, paper }: { size: number; ink: string; paper: string }) {
  const r = size * 0.25;
  const bar = size * 0.09;
  const gap = size * 0.0625;
  return (
    <div style={{ width: size, height: size, borderRadius: r, background: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        <div style={{ width: size * 0.44, height: bar, background: paper, borderRadius: bar }} />
        <div style={{ width: size * 0.44, height: bar, background: paper, borderRadius: bar }} />
        <div style={{ width: size * 0.25, height: bar, background: paper, borderRadius: bar }} />
      </div>
    </div>
  );
}

function Dot() {
  return <div style={{ width: 12, height: 12, borderRadius: 6, background: GREEN }} />;
}
function Row({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
      <Dot />
      <span>{children}</span>
    </div>
  );
}

function Wordmark({ size, ink, paper }: { size: number; ink: string; paper: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4, color: ink, fontFamily: "Instrument Sans", fontWeight: 600, fontSize: size * 0.95, letterSpacing: -size * 0.02 }}>
      <Mark size={size} ink={ink} paper={paper} />
      <span>Payslip</span>
    </div>
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!(asset in ASSETS)) return new Response("Not found", { status: 404 });
  const key = asset as Asset;
  const { width, height } = ASSETS[key];
  const [sans, serif] = await Promise.all([googleFont("Instrument Sans", 600), googleFont("Instrument Serif", 400)]);
  const fonts = [
    { name: "Instrument Sans", data: sans, weight: 600 as const, style: "normal" as const },
    { name: "Instrument Serif", data: serif, weight: 400 as const, style: "normal" as const },
  ];

  let body: ReactElement;
  switch (key) {
    case "wordmark-light":
      body = <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}><Wordmark size={200} ink={INK} paper={PAPER} /></div>;
      break;
    case "wordmark-dark":
      body = <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}><Wordmark size={200} ink={PAPER} paper={INK} /></div>;
      break;
    case "logo-square":
      body = (
        <div style={{ width, height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 56, background: PAPER, color: INK }}>
          <Mark size={360} ink={INK} paper={PAPER} />
          <div style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 132, letterSpacing: -3 }}>Payslip</div>
          <div style={{ fontFamily: "Instrument Serif", fontSize: 54, color: INK_2 }}>Private payouts on Solana</div>
        </div>
      );
      break;
    case "banner":
      body = (
        <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 110px", background: PAPER, color: INK }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Wordmark size={72} ink={INK} paper={PAPER} />
            <div style={{ fontFamily: "Instrument Serif", fontSize: 64, lineHeight: 1.05, letterSpacing: -1, maxWidth: 900 }}>Pay your people in USDC. Keep the amounts off the public ledger.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "Instrument Sans", fontSize: 26, color: INK_2, textAlign: "right" }}>
            <Row>Recipient sees their number</Row>
            <Row>Auditor sees every number</Row>
            <Row>Everyone else sees ••••••</Row>
          </div>
        </div>
      );
      break;
    case "cover":
      body = (
        <div style={{ width, height, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 120, background: PAPER, color: INK }}>
          <Wordmark size={64} ink={INK} paper={PAPER} />
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            <div style={{ fontFamily: "Instrument Serif", fontSize: 128, lineHeight: 1.0, letterSpacing: -3, maxWidth: 1500 }}>The only payout tool where the amounts are not public.</div>
            <div style={{ fontFamily: "Instrument Sans", fontSize: 40, color: INK_2 }}>Salaries, invoices, grants and bounties in USDC on Solana · Crypto World&apos;s Fair 2026</div>
          </div>
        </div>
      );
      break;
    default:
      body = (
        <div style={{ width, height, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: PAPER, color: INK }}>
          <Wordmark size={44} ink={INK} paper={PAPER} />
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontFamily: "Instrument Serif", fontSize: 76, lineHeight: 1.02, letterSpacing: -1.5, maxWidth: 1000 }}>Pay your people in USDC. Keep the amounts off the public ledger.</div>
            <div style={{ fontFamily: "Instrument Sans", fontSize: 28, color: INK_2 }}>Private payouts on Solana · Token-2022 confidential balances</div>
          </div>
        </div>
      );
  }
  return new ImageResponse(body, { width, height, fonts });
}
