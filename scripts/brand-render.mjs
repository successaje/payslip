// Pulls every brand PNG from the running dev server into brand/.
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.BASE_URL ?? "http://localhost:3200";
const out = { "wordmark-light": "brand/logo/wordmark-light.png", "wordmark-dark": "brand/logo/wordmark-dark.png", "logo-square": "brand/logo/logo-square-1024.png", og: "brand/social/og.png", banner: "brand/social/banner.png", cover: "brand/social/cover.png" };
mkdirSync("brand/logo", { recursive: true });
mkdirSync("brand/social", { recursive: true });
for (const [asset, file] of Object.entries(out)) {
  const r = await fetch(`${base}/brand/${asset}`);
  if (!r.ok) throw new Error(`${asset}: ${r.status}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  console.log(`${file}  ${(await import("node:fs")).statSync(file).size} bytes`);
}
