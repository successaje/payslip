import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Payslip: private USDC payouts on Solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f7f6f2",
          color: "#171614",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontFamily: "sans-serif", fontWeight: 600 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#171614", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ width: 18, height: 3, background: "#f7f6f2", borderRadius: 2 }} />
              <div style={{ width: 18, height: 3, background: "#f7f6f2", borderRadius: 2 }} />
              <div style={{ width: 11, height: 3, background: "#f7f6f2", borderRadius: 2 }} />
            </div>
          </div>
          Payslip
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -1.5, maxWidth: 1000 }}>
            Pay your people in USDC. Keep the amounts off the public ledger.
          </div>
          <div style={{ fontSize: 28, fontFamily: "sans-serif", color: "#4d4a44" }}>
            Private payouts on Solana · Token-2022 confidential balances
          </div>
        </div>
      </div>
    ),
    size,
  );
}
