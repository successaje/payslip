import type { Metadata } from "next";
import { Providers } from "@/components/app/Providers";
import { JoinFlow } from "@/components/join/JoinFlow";

export const metadata: Metadata = { title: "You're invited" };

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  return (
    <Providers>
      <JoinFlow token={token} />
    </Providers>
  );
}
