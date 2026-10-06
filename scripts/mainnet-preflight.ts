/**
 * Read-only mainnet preflight. Spends nothing, signs nothing.
 *
 *   npm run preflight:mainnet
 *   RPC_URL=https://... WALLET=<pubkey> npm run preflight:mainnet
 *
 * Checks, in order: RPC reachable and version-1 aware; Token-2022 and the ZK
 * ElGamal Proof program are live; USDC is the real Circle mint; the vault
 * program is (or is not yet) deployed and who can upgrade it; the deploy
 * wallet holds enough SOL for the program rent plus a working margin, and
 * whether it holds any USDC to wrap.
 */
import fs from "node:fs";
import path from "node:path";
import { address, createKeyPairSignerFromBytes, type Address } from "@solana/kit";
import { fetchMaybeMint, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { TOKEN_PROGRAM_ADDRESS, fetchMaybeToken, findAssociatedTokenPda } from "@solana-program/token";
import { makeRpc } from "./rpc";

const RPC_URL = process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
const USDC = address(process.env.USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const ZK_PROGRAM = address("ZkE1Gama1Proof11111111111111111111111111111");
const BPF_LOADER_UPGRADEABLE = "BPFLoaderUpgradeab1e11111111111111111111111";
const SO_PATH = path.resolve("program/target/deploy/payslip_vault.so");
const PROGRAM_KEYPAIR = path.resolve("program/target/deploy/payslip_vault-keypair.json");
/** Margin over program rent for the deploy transactions, the mint, two confidential accounts and a batch. */
const WORKING_MARGIN_SOL = 0.25;

type Line = { ok: boolean | null; label: string; detail?: string };
const lines: Line[] = [];
const push = (ok: boolean | null, label: string, detail?: string) => lines.push({ ok, label, detail });
const sol = (lamports: bigint) => `${(Number(lamports) / 1e9).toFixed(4)} SOL`;

async function main() {
  const { rpc } = makeRpc(RPC_URL, RPC_URL.replace(/^http/, "ws"));

  // 1. RPC
  try {
    const v = await rpc.getVersion().send();
    const slot = await rpc.getSlot({ commitment: "confirmed" }).send();
    push(true, "RPC reachable", `${RPC_URL} · solana-core ${v["solana-core"]} · slot ${slot.toLocaleString()}`);
    try {
      await rpc.getBlock(slot - 20n, { maxSupportedTransactionVersion: 1 as never, transactionDetails: "none", rewards: false, commitment: "confirmed" }).send();
      push(true, "RPC accepts maxSupportedTransactionVersion: 1", "Transaction V1 receipts and audit reads will work");
    } catch (e) {
      push(false, "RPC rejects maxSupportedTransactionVersion: 1", e instanceof Error ? e.message : String(e));
    }
  } catch (e) {
    push(false, "RPC unreachable", e instanceof Error ? e.message : String(e));
    return report();
  }

  // 2. Programs
  for (const [label, id] of [
    ["Token-2022 program", TOKEN_2022_PROGRAM_ADDRESS],
    ["ZK ElGamal Proof program", ZK_PROGRAM],
  ] as const) {
    const info = await rpc.getAccountInfo(id, { encoding: "base64" }).send();
    push(Boolean(info.value?.executable), label, info.value?.executable ? "executable" : "missing or not executable");
  }

  // 3. USDC
  const mint = await fetchMaybeMint(rpc, USDC);
  if (!mint.exists) push(false, "USDC mint", `${USDC} not found`);
  else {
    const legacy = mint.programAddress === TOKEN_PROGRAM_ADDRESS;
    push(mint.data.decimals === 6 && legacy, "USDC mint", `${USDC} · ${mint.data.decimals} decimals · ${legacy ? "SPL Token (the vault wraps it through the token interface)" : `owner ${mint.programAddress}`}`);
  }

  // 4. Vault program
  let programId: Address | null = null;
  if (fs.existsSync(PROGRAM_KEYPAIR)) {
    const kp = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(fs.readFileSync(PROGRAM_KEYPAIR, "utf8"))));
    programId = kp.address;
  }
  const soBytes = fs.existsSync(SO_PATH) ? fs.statSync(SO_PATH).size : null;
  if (!programId || soBytes === null) {
    push(false, "Program artifacts", `need ${PROGRAM_KEYPAIR} and ${SO_PATH}; run \`anchor build --no-idl\` in program/`);
  } else {
    const info = await rpc.getAccountInfo(programId, { encoding: "base64" }).send();
    if (info.value?.executable) {
      push(true, "Vault program deployed", `${programId}`);
      // Upgrade authority lives in the ProgramData account.
      const [programData] = await (await import("@solana/kit")).getProgramDerivedAddress({ programAddress: address(BPF_LOADER_UPGRADEABLE), seeds: [new Uint8Array((await import("@solana/kit")).getAddressEncoder().encode(programId))] });
      const pd = await rpc.getAccountInfo(programData, { encoding: "base64" }).send();
      if (pd.value) {
        const raw = Buffer.from(pd.value.data[0], "base64");
        const hasAuthority = raw[12] === 1;
        const authority = hasAuthority ? (await import("@solana/kit")).getAddressDecoder().decode(raw.subarray(13, 45)) : null;
        push(null, "Upgrade authority", authority ?? "none (immutable)");
      }
    } else {
      push(null, "Vault program not deployed yet", `${programId} · same keypair as devnet, so the address will match`);
    }
  }

  // 5. Deploy wallet
  const walletArg = process.env.WALLET;
  let wallet: Address | null = null;
  if (walletArg) wallet = address(walletArg);
  else {
    const p = path.join(process.env.HOME ?? "", ".config/solana/id.json");
    if (fs.existsSync(p)) wallet = (await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(fs.readFileSync(p, "utf8"))))).address;
  }
  if (!wallet) push(false, "Deploy wallet", "set WALLET=<pubkey> or have ~/.config/solana/id.json");
  else {
    const { value: lamports } = await rpc.getBalance(wallet).send();
    const rent = soBytes !== null ? await rpc.getMinimumBalanceForRentExemption(BigInt(soBytes + 45)).send() : 0n;
    const need = rent + BigInt(Math.round(WORKING_MARGIN_SOL * 1e9));
    const deployed = lines.some((l) => l.label === "Vault program deployed");
    const required = deployed ? BigInt(Math.round(WORKING_MARGIN_SOL * 1e9)) : need;
    push(
      lamports >= required,
      `Deploy wallet ${wallet}`,
      `${sol(lamports)} available · needs ${sol(required)}${deployed ? " for a run" : ` (program rent ${sol(rent)} + ${WORKING_MARGIN_SOL} SOL margin)`}${lamports < required ? ` · short by ${sol(required - lamports)}` : ""}`,
    );
    const [ata] = await findAssociatedTokenPda({ owner: wallet, mint: USDC, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    const usdc = await fetchMaybeToken(rpc, ata);
    const bal = usdc.exists ? usdc.data.amount : 0n;
    push(null, "USDC to wrap", bal > 0n ? `$${(Number(bal) / 1e6).toFixed(2)}` : "none yet; a few dollars is enough for the first run");
  }

  report();
}

function report() {
  const mark = (ok: boolean | null) => (ok === null ? "·" : ok ? "✓" : "✗");
  console.log(`\nPayslip mainnet preflight · ${new Date().toISOString()}\n`);
  for (const l of lines) console.log(`${mark(l.ok)} ${l.label}${l.detail ? `\n    ${l.detail}` : ""}`);
  const failed = lines.filter((l) => l.ok === false);
  console.log(`\n${failed.length === 0 ? "Ready. Nothing was spent or signed." : `${failed.length} blocker${failed.length === 1 ? "" : "s"}. Nothing was spent or signed.`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
