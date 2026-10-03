/**
 * Turns the many shapes of wallet, RPC and program errors into a sentence a
 * person can act on. Raw messages are kept on `detail` for support, never
 * shown by default.
 */
export interface DescribedError {
  message: string;
  detail?: string;
  /** The user declined in their wallet; not a failure to report loudly. */
  cancelled: boolean;
}

export function describeError(e: unknown): DescribedError {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
  const lower = raw.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("rejected the request") || lower.includes("user declined") || lower.includes("cancel")) {
    return { message: "You cancelled in your wallet. Nothing was sent.", detail: raw, cancelled: true };
  }
  if (lower.includes("insufficient lamports") || lower.includes("insufficient funds for rent") || lower.includes("attempt to debit an account but found no record")) {
    return { message: "This wallet needs a little SOL to pay network fees.", detail: raw, cancelled: false };
  }
  if (lower.includes("insufficient funds") || lower.includes("0x1 ") || lower.endsWith("0x1")) {
    return { message: "Not enough balance to complete this.", detail: raw, cancelled: false };
  }
  if (lower.includes("blockhash not found") || lower.includes("block height exceeded") || lower.includes("expired")) {
    return { message: "The network moved on before this confirmed. Try again.", detail: raw, cancelled: false };
  }
  if (lower.includes("429") || lower.includes("too many requests")) {
    return { message: "The network endpoint is rate-limiting us. Wait a moment and retry.", detail: raw, cancelled: false };
  }
  if (lower.includes("failed to fetch") || lower.includes("network error") || lower.includes("econnrefused")) {
    return { message: "Could not reach the network. Check your connection and retry.", detail: raw, cancelled: false };
  }
  if (lower.includes("wrong network") || lower.includes("chain")) {
    return { message: "Your wallet is on a different network. Switch it and retry.", detail: raw, cancelled: false };
  }
  return { message: "Something went wrong. Your funds were not moved.", detail: raw, cancelled: false };
}
