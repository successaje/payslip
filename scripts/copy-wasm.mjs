/**
 * Copies the zk-sdk WASM binary into public/ so the browser build can fetch
 * it at a stable URL. Runs on postinstall; idempotent.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/@solana/zk-sdk/dist/web/index_bg.wasm");
const dest = resolve(root, "public/zk/zk_sdk_bg.wasm");

if (!existsSync(src)) {
  console.warn("[copy-wasm] zk-sdk not installed yet; skipping");
  process.exit(0);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[copy-wasm] copied zk-sdk wasm to public/zk/zk_sdk_bg.wasm");
