import type { Metadata } from "next";
import { Providers } from "@/components/app/Providers";
import { AuditorKeyTool } from "@/components/auditor/AuditorKeyTool";

export const metadata: Metadata = { title: "Auditor key" };

/**
 * Public tool for a future auditor: connect a wallet, sign once, get the
 * ElGamal public key the employer pastes during company setup.
 */
export default function AuditorKeyPage() {
  return (
    <Providers>
      <AuditorKeyTool />
    </Providers>
  );
}
