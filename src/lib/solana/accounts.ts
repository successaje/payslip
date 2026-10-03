import type { Address } from "@solana/kit";
import { TOKEN_2022_PROGRAM_ADDRESS, fetchMaybeToken, findAssociatedTokenPda } from "@solana-program/token-2022";
import type { SolanaClient } from "./rpc";

export interface HolderState {
  /** The associated token account address for this owner + mint. */
  token: Address;
  exists: boolean;
  /** Has the confidential-transfer extension been configured on the account. */
  configured: boolean;
  /** Plain (visible) balance in base units. */
  publicAmount: bigint;
  /** Number of incoming confidential credits not yet applied to the available balance. */
  pendingCredits: bigint;
  elgamalPubkey: Address | null;
}

export async function tokenAddressFor(owner: Address, mint: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({ owner, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  return ata;
}

/** Reads what the chain says about one holder of a payroll token. */
export async function readHolderState(client: SolanaClient, owner: Address, mint: Address): Promise<HolderState> {
  const token = await tokenAddressFor(owner, mint);
  const account = await fetchMaybeToken(client.rpc, token);
  if (!account.exists) {
    return { token, exists: false, configured: false, publicAmount: 0n, pendingCredits: 0n, elgamalPubkey: null };
  }
  const ext =
    account.data.extensions.__option === "Some"
      ? account.data.extensions.value.find((e) => e.__kind === "ConfidentialTransferAccount")
      : undefined;
  if (!ext || ext.__kind !== "ConfidentialTransferAccount") {
    return { token, exists: true, configured: false, publicAmount: account.data.amount, pendingCredits: 0n, elgamalPubkey: null };
  }
  return {
    token,
    exists: true,
    configured: ext.approved,
    publicAmount: account.data.amount,
    pendingCredits: ext.pendingBalanceCreditCounter,
    elgamalPubkey: ext.elgamalPubkey,
  };
}
