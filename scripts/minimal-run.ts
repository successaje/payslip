/**
 * The minimal private payout, end to end, from the command line. No vault
 * program: the payer wallet is the mint authority of a fresh Token-2022 mint
 * with the confidential extension and the payer's auditor key. One payout
 * settles in a single Transaction V1; the recipient and the auditor each
 * read the amount back from the chain.
 *
 *   npm run run:minimal                                   # devnet, CLI wallet
 *   RPC_URL=https://<keyed mainnet rpc> CONFIRM=mainnet npm run run:minimal
 *
 * Env: RPC_URL, WS_URL, PAYER (keypair path, default ~/.config/solana/id.json),
 * RECIPIENT (keypair path; generated under scripts/.keys/ when absent),
 * AMOUNT (base units, default 1000000 = $1.00), CONFIRM=mainnet to allow a
 * mainnet RPC. The payer pays every fee; the recipient needs no SOL.
 */
import fs from "node:fs";
import path from "node:path";
import { createKeyPairSignerFromBytes, generateKeyPairSigner, type Address, type KeyPairSigner, type Signature } from "@solana/kit";
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  extension,
  getInitializeConfidentialTransferMintInstruction,
  getInitializeMintInstruction,
  getMintSize,
  getMintToInstruction,
} from "@solana-program/token-2022";
import { applyPendingBalance, configureAccount, decryptBalance, deposit, deriveAuditorElgamalKeypair, getAuditorElgamalPubkey } from "@softseco/confidential-transfers";
import { makeRpc } from "./rpc";
import { auditorAmount, confidentialTransferV1, recipientAmount, sendTx } from "./lib/confidentialNode";

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const WS_URL = process.env.WS_URL ?? RPC_URL.replace(/^http/, "ws");
const AMOUNT = BigInt(process.env.AMOUNT ?? "1000000");
const DECIMALS = 6;
const MIN_PAYER_SOL = 0.03;
const isMainnet = /mainnet/i.test(RPC_URL) || process.env.CONFIRM === "mainnet";
const clusterTag = isMainnet ? "" : "?cluster=devnet";
const usd = (v: bigint) => `$${(Number(v) / 1e6).toFixed(2)}`;
const tx = (s: Signature) => `https://solscan.io/tx/${s}${clusterTag}`;
const acct = (a: Address) => `https://solscan.io/account/${a}${clusterTag}`;

async function loadOrCreate(file: string): Promise<KeyPairSigner> {
  if (fs.existsSync(file)) return createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(fs.readFileSync(file, "utf8"))));
  const kp = await generateKeyPairSigner(true);
  // Persist so the recipient can be reused and its statements re-verified later.
  const { exportKeyPairBytes } = await import("./lib/keys");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(Array.from(await exportKeyPairBytes(kp))), { mode: 0o600 });
  return kp;
}

async function main() {
  if (isMainnet && process.env.CONFIRM !== "mainnet") {
    console.error("This RPC looks like mainnet. Re-run with CONFIRM=mainnet to spend real SOL.");
    process.exit(2);
  }
  const client = makeRpc(RPC_URL, WS_URL);
  const { rpc } = client;
  const payer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(fs.readFileSync(process.env.PAYER ?? path.join(process.env.HOME ?? "", ".config/solana/id.json"), "utf8"))));
  const recipientFile = process.env.RECIPIENT ?? path.resolve(`scripts/.keys/recipient-${isMainnet ? "mainnet" : "devnet"}.json`);
  const recipient = await loadOrCreate(recipientFile);

  const { value: lamports } = await rpc.getBalance(payer.address).send();
  const sol = Number(lamports) / 1e9;
  console.log(`\nPayslip minimal run · ${isMainnet ? "MAINNET" : "devnet"} · ${RPC_URL}`);
  console.log(`payer      ${payer.address}  ${sol.toFixed(4)} SOL`);
  console.log(`recipient  ${recipient.address}  (${recipientFile})`);
  console.log(`amount     ${usd(AMOUNT)}\n`);
  if (sol < MIN_PAYER_SOL) {
    console.error(`Payer needs at least ${MIN_PAYER_SOL} SOL. Nothing was sent.`);
    process.exit(1);
  }

  const report: Record<string, unknown> = { cluster: isMainnet ? "mainnet-beta" : "devnet", rpc: RPC_URL, startedAt: new Date().toISOString(), payer: payer.address, recipient: recipient.address, amount: AMOUNT.toString() };
  const step = (n: number, label: string) => console.log(`${n}. ${label}`);

  // 1. Auditor key: derived from the payer wallet, exactly as the app does for "Me, for now".
  const auditorKeypair = await deriveAuditorElgamalKeypair(payer);
  const auditorPubkey = getAuditorElgamalPubkey(auditorKeypair);
  step(1, `auditor key derived from payer: ${auditorPubkey}`);

  // 2. Mint with the confidential extension. Payer is mint authority (no vault).
  const mint = await generateKeyPairSigner();
  const space = getMintSize([extension("ConfidentialTransferMint", { authority: payer.address, autoApproveNewAccounts: true, auditorElgamalPubkey: auditorPubkey })]);
  const rent = await rpc.getMinimumBalanceForRentExemption(BigInt(space)).send();
  const mintSig = await sendTx(client, payer, [
    getCreateAccountInstruction({ payer, newAccount: mint, lamports: rent, space, programAddress: TOKEN_2022_PROGRAM_ADDRESS }),
    getInitializeConfidentialTransferMintInstruction({ mint: mint.address, authority: payer.address, autoApproveNewAccounts: true, auditorElgamalPubkey: auditorPubkey }),
    getInitializeMintInstruction({ mint: mint.address, decimals: DECIMALS, mintAuthority: payer.address, freezeAuthority: null }),
  ]);
  step(2, `mint created ${mint.address}\n   ${tx(mintSig)}`);
  report.mint = mint.address;
  report.mintSignature = mintSig;

  // 3. Confidential accounts. The payer pays both; the recipient only signs.
  const payerAcct = await configureAccount({ ...client, payer, owner: payer, mint: mint.address });
  const recipAcct = await configureAccount({ ...client, payer, owner: recipient, mint: mint.address });
  step(3, `confidential accounts configured\n   payer     ${tx(payerAcct.signature)}\n   recipient ${tx(recipAcct.signature)}`);
  report.configureSignatures = [payerAcct.signature, recipAcct.signature];

  // 4. Fund the payer: mint to the public balance, deposit to private, apply.
  const mintToSig = await sendTx(client, payer, [getMintToInstruction({ mint: mint.address, token: payerAcct.token, mintAuthority: payer, amount: AMOUNT })]);
  const dep = await deposit({ ...client, payer, owner: payer, mint: mint.address, amount: AMOUNT, decimals: DECIMALS });
  const app = await applyPendingBalance({ ...client, payer, owner: payer, mint: mint.address });
  step(4, `payer funded ${usd(AMOUNT)} and moved to private\n   mint    ${tx(mintToSig)}\n   deposit ${tx(dep.signature)}\n   apply   ${tx(app.signature)}`);
  report.fundSignatures = [mintToSig, dep.signature, app.signature];

  // 5. The payout: one Transaction V1.
  const v1 = await confidentialTransferV1(client, payer, mint.address, recipient.address, AMOUNT, auditorPubkey);
  step(5, `PAYOUT ${usd(AMOUNT)} in one Transaction V1 · ${v1.bytes} bytes · ${v1.computeUnits?.toLocaleString()} CU · ${v1.seconds.toFixed(1)}s\n   ${tx(v1.signature)}`);
  report.payout = { signature: v1.signature, bytes: v1.bytes, computeUnits: v1.computeUnits?.toString() ?? null, seconds: v1.seconds };

  // 6. Recipient: confirm receipt, decrypt balance, verify the statement from the proof.
  const recApply = await applyPendingBalance({ ...client, payer, owner: recipient, mint: mint.address });
  const recBalance = await decryptBalance({ rpc, owner: recipient, mint: mint.address });
  const recFromChain = await recipientAmount(rpc, recipient, v1.signature);
  step(6, `recipient confirmed receipt · private balance ${usd(recBalance)} · statement from chain ${usd(recFromChain)} ${recFromChain === AMOUNT ? "✓" : "✗"}\n   ${tx(recApply.signature)}`);
  report.recipient = { applySignature: recApply.signature, balance: recBalance.toString(), fromChain: recFromChain.toString() };

  // 7. Auditor reads the same transfer.
  const audited = await auditorAmount(rpc, auditorKeypair, v1.signature);
  step(7, `auditor decrypts the transfer from chain: ${usd(audited)} ${audited === AMOUNT ? "✓ books match" : "✗ mismatch"}`);
  report.auditor = { fromChain: audited.toString() };

  const { value: after } = await rpc.getBalance(payer.address).send();
  const spent = (Number(lamports - after) / 1e9).toFixed(6);
  report.spentSol = spent;
  report.finishedAt = new Date().toISOString();
  const out = path.resolve(`docs/runs/${isMainnet ? "mainnet" : "devnet"}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\nDone. Spent ${spent} SOL in total (mint rent is the bulk and stays with the mint).`);
  console.log(`mint ${acct(mint.address)}\nreport ${path.relative(process.cwd(), out)}\n`);
}

main().catch((e) => {
  console.error("\nFailed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
