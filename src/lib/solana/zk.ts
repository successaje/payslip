"use client";

/**
 * Initialises the zk-sdk WASM module in the browser exactly once.
 *
 * The confidential-transfers client imports `@solana/zk-sdk/node`; the
 * bundler aliases that to `@solana/zk-sdk/web` (see next.config.ts), whose
 * default export fetches and instantiates the WASM binary we copy to
 * public/zk at install time.
 */
import init from "@solana/zk-sdk/web";

let ready: Promise<void> | null = null;

export function initZk(): Promise<void> {
  if (!ready) {
    ready = init({ module_or_path: "/zk/zk_sdk_bg.wasm" }).then(() => undefined);
  }
  return ready;
}
