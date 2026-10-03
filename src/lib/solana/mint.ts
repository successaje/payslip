import { generateKeyPairSigner, type Address, type Signature, type TransactionSigner } from "@solana/kit";
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  extension,
  getInitializeConfidentialTransferMintInstruction,
  getInitializeMintInstruction,
  getMintSize,
  fetchMint,
} from "@solana-program/token-2022";
import { getCreateAccountInstruction } from "@solana-program/system";
import { DECIMALS } from "@/lib/domain/money";
import type { SolanaClient } from "./rpc";
import { sendInstructions, type SendOptions } from "./send";

export interface CreateCompanyMintInput {
  client: SolanaClient;
  /** Pays rent and fees, and becomes the confidential-transfer config authority. */
  payer: TransactionSigner;
  /** Who may mint. The vault PDA in production; the employer wallet until the vault program is deployed. */
  mintAuthority: Address;
  /** Auditor's ElGamal public key, base58. */
  auditorElgamalPubkey: Address;
}

export interface CreateCompanyMintResult {
  mint: Address;
  signature: Signature;
}

/**
 * Creates the company's payroll token: a Token-2022 mint with the
 * confidential-transfer extension and the auditor key set at creation.
 * Accounts are auto-approved so employees do not need a second approval step.
 */
export async function createCompanyMint(
  { client, payer, mintAuthority, auditorElgamalPubkey }: CreateCompanyMintInput,
  options: SendOptions = {},
): Promise<CreateCompanyMintResult> {
  const mint = await generateKeyPairSigner();
  const space = getMintSize([
    extension("ConfidentialTransferMint", {
      authority: payer.address,
      autoApproveNewAccounts: true,
      auditorElgamalPubkey,
    }),
  ]);
  const lamports = await client.rpc.getMinimumBalanceForRentExemption(BigInt(space)).send();

  const signature = await sendInstructions(
    client,
    payer,
    [
      getCreateAccountInstruction({
        payer,
        newAccount: mint,
        lamports,
        space,
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      }),
      getInitializeConfidentialTransferMintInstruction({
        mint: mint.address,
        authority: payer.address,
        autoApproveNewAccounts: true,
        auditorElgamalPubkey,
      }),
      getInitializeMintInstruction({
        mint: mint.address,
        decimals: DECIMALS,
        mintAuthority,
        freezeAuthority: null,
      }),
    ],
    options,
  );

  return { mint: mint.address, signature };
}

/** Reads the mint and returns its confidential-transfer config, or null. */
export async function readMintConfig(client: SolanaClient, mint: Address) {
  const account = await fetchMint(client.rpc, mint);
  const ext = account.data.extensions.__option === "Some"
    ? account.data.extensions.value.find((e) => e.__kind === "ConfidentialTransferMint")
    : undefined;
  if (!ext || ext.__kind !== "ConfidentialTransferMint") return null;
  return {
    supply: account.data.supply,
    decimals: account.data.decimals,
    mintAuthority: account.data.mintAuthority,
    autoApproveNewAccounts: ext.autoApproveNewAccounts,
    auditorElgamalPubkey: ext.auditorElgamalPubkey.__option === "Some" ? ext.auditorElgamalPubkey.value : null,
  };
}
