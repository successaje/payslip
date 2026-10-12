import {
  address as toAddress,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { TOKEN_PROGRAM_ADDRESS, fetchMaybeToken, findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstruction, getTransferInstruction } from "@solana-program/token";
import { ApiError, handle, json, requireSession } from "@/lib/api/server";
import { CLUSTER, RPC_URL, RPC_WS_URL, USDC_MINT } from "@/lib/solana/config";

/**
 * Devnet-only test funds for a signed-in wallet: a little SOL for fees and
 * rent, and some test USDC to wrap. The faucet wallet only holds balances
 * (no mint authority), is capped per call, and refuses when the wallet is
 * already funded, so it cannot be drained by one visitor.
 */
const SOL_GRANT = 50_000_000n; // 0.05 SOL
const SOL_SKIP_ABOVE = 40_000_000n;
const USDC_GRANT = 100_000_000n; // 100 test USDC
const USDC_SKIP_ABOVE = 50_000_000n;

export const POST = handle(async () => {
  if (CLUSTER !== "devnet") throw new ApiError(404, "Not available on this cluster");
  const secret = process.env.DEVNET_FAUCET_SECRET;
  if (!secret) throw new ApiError(503, "The devnet faucet is not configured");
  const session = await requireSession();
  const recipient = toAddress(session.address);

  const rpc = createSolanaRpc(RPC_URL);
  const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_WS_URL);
  const faucet = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(secret) as number[]));

  const [{ value: solBalance }, [recipientAta], [faucetAta]] = await Promise.all([
    rpc.getBalance(recipient).send(),
    findAssociatedTokenPda({ owner: recipient, mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS }),
    findAssociatedTokenPda({ owner: faucet.address, mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS }),
  ]);
  const usdcAccount = await fetchMaybeToken(rpc, recipientAta);
  const usdcBalance = usdcAccount.exists ? usdcAccount.data.amount : 0n;

  const ixs: Instruction[] = [];
  const granted: { sol: string; usdc: string } = { sol: "0", usdc: "0" };
  if (solBalance < SOL_SKIP_ABOVE) {
    ixs.push(getTransferSolInstruction({ source: faucet, destination: recipient, amount: lamports(SOL_GRANT) }));
    granted.sol = SOL_GRANT.toString();
  }
  if (usdcBalance < USDC_SKIP_ABOVE) {
    ixs.push(
      getCreateAssociatedTokenIdempotentInstruction({ payer: faucet, owner: recipient, mint: USDC_MINT, ata: recipientAta, tokenProgram: TOKEN_PROGRAM_ADDRESS }),
      getTransferInstruction({ source: faucetAta, destination: recipientAta, authority: faucet, amount: USDC_GRANT }),
    );
    granted.usdc = USDC_GRANT.toString();
  }
  if (ixs.length === 0) return json({ granted, signature: null, note: "Already funded" });

  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(faucet, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(ixs, m),
  );
  const signed = await signTransactionMessageWithSigners(message);
  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed as never, { commitment: "confirmed" });
  return json({ granted, signature: getSignatureFromTransaction(signed) });
});
