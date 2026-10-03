import {
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  createSolanaRpcSubscriptions,
  type Rpc,
  type RpcSubscriptions,
  type RpcTransport,
  type SolanaRpcApi,
  type SolanaRpcSubscriptionsApi,
} from "@solana/kit";
import { RPC_URL, RPC_WS_URL } from "./config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A transport that backs off on HTTP 429 instead of failing a multi-step
 * plan. Confidential transfers issue a burst of RPC calls (proof context
 * accounts, simulations, confirmations) and public endpoints rate-limit them.
 */
export function createRetryingTransport(url: string, maxAttempts = 8): RpcTransport {
  const base = createDefaultRpcTransport({ url });
  return async (...args) => {
    let attempt = 0;
    for (;;) {
      try {
        return await base(...args);
      } catch (e: unknown) {
        const ctx = (e as { context?: { statusCode?: number; headers?: Headers } })?.context;
        if (ctx?.statusCode !== 429 || ++attempt >= maxAttempts) throw e;
        const retryAfter = Number(ctx.headers?.get?.("retry-after")) || 0;
        await sleep(Math.max(retryAfter * 1000, 400 * 2 ** attempt));
      }
    }
  };
}

export type SolanaClient = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

let cached: SolanaClient | null = null;

/** Process-wide client. Safe to call from any component or route handler. */
export function getSolanaClient(): SolanaClient {
  if (cached) return cached;
  cached = {
    rpc: createSolanaRpcFromTransport(createRetryingTransport(RPC_URL)),
    rpcSubscriptions: createSolanaRpcSubscriptions(RPC_WS_URL),
  };
  return cached;
}
