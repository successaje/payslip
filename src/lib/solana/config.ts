import { address, type Address } from "@solana/kit";

export type Cluster = "devnet" | "mainnet-beta";

function readCluster(): Cluster {
  const v = process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
  return v === "mainnet-beta" ? "mainnet-beta" : "devnet";
}

export const CLUSTER: Cluster = readCluster();

/** Wallet-standard chain identifier for the active cluster. */
export const CHAIN: `solana:${string}` = CLUSTER === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  (CLUSTER === "mainnet-beta" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com");

export const RPC_WS_URL =
  process.env.NEXT_PUBLIC_RPC_WS_URL ??
  (CLUSTER === "mainnet-beta" ? "wss://api.mainnet-beta.solana.com" : "wss://api.devnet.solana.com");

/** USDC mint the vault wraps. */
export const USDC_MINT: Address = address(
  process.env.NEXT_PUBLIC_USDC_MINT ??
    (CLUSTER === "mainnet-beta"
      ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
);

export const VAULT_PROGRAM_ID: Address | null = process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID
  ? address(process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID)
  : null;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3200";

export function explorerUrl(kind: "tx" | "address", id: string): string {
  const cluster = CLUSTER === "mainnet-beta" ? "" : `?cluster=${CLUSTER}`;
  return `https://solscan.io/${kind === "tx" ? "tx" : "account"}/${id}${cluster}`;
}
