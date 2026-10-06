import type { Metadata } from "next";
import { Providers } from "@/components/app/Providers";
import { ClaimFlow } from "@/components/join/ClaimFlow";

export const metadata: Metadata = { title: "Get paid privately" };

/**
 * Public self-registration link. Anyone with a wallet can register as a
 * recipient; the payer approves and sets the amount before any payout.
 */
export default async function ClaimPage({ params }: PageProps<"/claim/[token]">) {
  const { token } = await params;
  return (
    <Providers>
      <ClaimFlow token={token} />
    </Providers>
  );
}
