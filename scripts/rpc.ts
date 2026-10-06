import { createDefaultRpcTransport, createSolanaRpcFromTransport, createSolanaRpcSubscriptions, type RpcTransport } from "@solana/kit";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

export function makeRpc(httpUrl: string, wsUrl: string) {
  return {
    rpc: createSolanaRpcFromTransport(createRetryingTransport(httpUrl)),
    rpcSubscriptions: createSolanaRpcSubscriptions(wsUrl),
  };
}
