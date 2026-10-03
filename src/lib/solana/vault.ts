/**
 * Client for the payslip_vault program (program/).
 *
 * The program has three instructions. Their wire format is Anchor's: an
 * 8-byte discriminator (sha256("global:<name>")[..8]) followed by Borsh
 * arguments. Accounts are listed in the order of the #[derive(Accounts)]
 * structs. Written by hand against the program source so the app does not
 * depend on an IDL build.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import {
  AccountRole,
  getAddressEncoder,
  getProgramDerivedAddress,
  getU64Encoder,
  type AccountMeta,
  type AccountSignerMeta,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";

/** An instruction whose signer accounts carry their signer, so kit can sign it. */
export type VaultInstruction = Instruction<string, readonly (AccountMeta | AccountSignerMeta)[]>;
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
} from "@solana-program/token-2022";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { USDC_MINT, VAULT_PROGRAM_ID } from "./config";
import type { SolanaClient } from "./rpc";
import { fetchMaybeToken } from "@solana-program/token-2022";

function discriminator(name: string): Uint8Array {
  return sha256(new TextEncoder().encode(`global:${name}`)).slice(0, 8);
}

const DISC = {
  initVault: discriminator("init_vault"),
  wrap: discriminator("wrap"),
  unwrap: discriminator("unwrap"),
};

export function requireVaultProgram(): Address {
  if (!VAULT_PROGRAM_ID) throw new Error("Vault program is not configured (NEXT_PUBLIC_VAULT_PROGRAM_ID)");
  return VAULT_PROGRAM_ID;
}

/** The PDA that is mint authority for a payroll mint and owner of its USDC vault. */
export async function findVaultAuthority(payrollMint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: requireVaultProgram(),
    seeds: [new TextEncoder().encode("vault"), getAddressEncoder().encode(payrollMint)],
  });
  return pda;
}

/** The vault's USDC token account: the classic-token ATA of the vault authority. */
export async function findVaultUsdc(payrollMint: Address): Promise<Address> {
  const authority = await findVaultAuthority(payrollMint);
  const [ata] = await findAssociatedTokenPda({ owner: authority, mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  return ata;
}

export async function findUserUsdc(owner: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({ owner, mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  return ata;
}

export async function findUserPayroll(owner: Address, payrollMint: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({ owner, mint: payrollMint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  return ata;
}

function amountData(disc: Uint8Array, amount: bigint): Uint8Array {
  const out = new Uint8Array(16);
  out.set(disc, 0);
  out.set(getU64Encoder().encode(amount), 8);
  return out;
}

export async function getInitVaultInstruction(payer: TransactionSigner, payrollMint: Address): Promise<VaultInstruction> {
  const programAddress = requireVaultProgram();
  return {
    programAddress,
    accounts: [
      { address: payer.address, role: AccountRole.WRITABLE_SIGNER, signer: payer },
      { address: payrollMint, role: AccountRole.READONLY },
      { address: USDC_MINT, role: AccountRole.READONLY },
      { address: await findVaultAuthority(payrollMint), role: AccountRole.READONLY },
      { address: await findVaultUsdc(payrollMint), role: AccountRole.WRITABLE },
      { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: DISC.initVault,
  };
}

export async function getWrapInstruction(user: TransactionSigner, payrollMint: Address, amount: bigint): Promise<VaultInstruction> {
  const programAddress = requireVaultProgram();
  return {
    programAddress,
    accounts: [
      { address: user.address, role: AccountRole.WRITABLE_SIGNER, signer: user },
      { address: payrollMint, role: AccountRole.WRITABLE },
      { address: USDC_MINT, role: AccountRole.READONLY },
      { address: await findVaultAuthority(payrollMint), role: AccountRole.READONLY },
      { address: await findVaultUsdc(payrollMint), role: AccountRole.WRITABLE },
      { address: await findUserUsdc(user.address), role: AccountRole.WRITABLE },
      { address: await findUserPayroll(user.address, payrollMint), role: AccountRole.WRITABLE },
      { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: amountData(DISC.wrap, amount),
  };
}

export async function getUnwrapInstruction(user: TransactionSigner, payrollMint: Address, amount: bigint): Promise<VaultInstruction> {
  const programAddress = requireVaultProgram();
  return {
    programAddress,
    accounts: [
      { address: user.address, role: AccountRole.WRITABLE_SIGNER, signer: user },
      { address: payrollMint, role: AccountRole.WRITABLE },
      { address: USDC_MINT, role: AccountRole.READONLY },
      { address: await findVaultAuthority(payrollMint), role: AccountRole.READONLY },
      { address: await findVaultUsdc(payrollMint), role: AccountRole.WRITABLE },
      { address: await findUserUsdc(user.address), role: AccountRole.WRITABLE },
      { address: await findUserPayroll(user.address, payrollMint), role: AccountRole.WRITABLE },
      { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: amountData(DISC.unwrap, amount),
  };
}

/** USDC held by the vault for a payroll mint (should equal the mint's supply). */
export async function readVaultBalance(client: SolanaClient, payrollMint: Address): Promise<bigint> {
  const account = await fetchMaybeToken(client.rpc, await findVaultUsdc(payrollMint));
  return account.exists ? account.data.amount : 0n;
}

/** A wallet's plain USDC balance. */
export async function readUsdcBalance(client: SolanaClient, owner: Address): Promise<bigint> {
  const account = await fetchMaybeToken(client.rpc, await findUserUsdc(owner));
  return account.exists ? account.data.amount : 0n;
}
