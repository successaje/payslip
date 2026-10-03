//! payslip_vault
//!
//! Backs a company's confidential payroll token 1:1 with USDC.
//!
//! The payroll token is a Token-2022 mint whose mint authority is this
//! program's vault PDA for that mint. Supply can only be created by
//! depositing USDC (`wrap`) and only destroyed by withdrawing it (`unwrap`).
//! There is no admin: nobody can mint without depositing or withdraw without
//! burning.
//!
//! Invariant: payroll_mint.supply == vault_usdc.amount, always.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    self, Burn, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("AjfdhEkypXPzBfxHL4rhX9UNMpzWbD51D56U8XVhcX2L");

pub const VAULT_SEED: &[u8] = b"vault";

#[program]
pub mod payslip_vault {
    use super::*;

    /// Creates the vault's USDC account for a payroll mint. Anyone can call it;
    /// it is idempotent at the account level and pays only rent.
    pub fn init_vault(ctx: Context<InitVault>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.payroll_mint.mint_authority.unwrap_or_default(),
            ctx.accounts.vault_authority.key(),
            VaultError::MintAuthorityMismatch
        );
        require!(
            ctx.accounts.payroll_mint.decimals == ctx.accounts.usdc_mint.decimals,
            VaultError::DecimalsMismatch
        );
        emit!(VaultInitialized {
            payroll_mint: ctx.accounts.payroll_mint.key(),
            vault_usdc: ctx.accounts.vault_usdc.key(),
        });
        Ok(())
    }

    /// Deposit `amount` USDC and receive the same amount of payroll token.
    pub fn wrap(ctx: Context<Wrap>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.usdc_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.vault_usdc.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )?;

        let mint_key = ctx.accounts.payroll_mint.key();
        let seeds: &[&[u8]] = &[VAULT_SEED, mint_key.as_ref(), &[ctx.bumps.vault_authority]];
        token_interface::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.payroll_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.payroll_mint.to_account_info(),
                    to: ctx.accounts.user_payroll.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        emit!(Wrapped { payroll_mint: mint_key, user: ctx.accounts.user.key(), amount });
        Ok(())
    }

    /// Burn `amount` payroll token and receive the same amount of USDC.
    pub fn unwrap(ctx: Context<Unwrap>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        token_interface::burn(
            CpiContext::new(
                ctx.accounts.payroll_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.payroll_mint.to_account_info(),
                    from: ctx.accounts.user_payroll.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let mint_key = ctx.accounts.payroll_mint.key();
        let seeds: &[&[u8]] = &[VAULT_SEED, mint_key.as_ref(), &[ctx.bumps.vault_authority]];
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.usdc_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )?;

        emit!(Unwrapped { payroll_mint: mint_key, user: ctx.accounts.user.key(), amount });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub payroll_mint: InterfaceAccount<'info, Mint>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA used only as a signer; holds no data.
    #[account(seeds = [VAULT_SEED, payroll_mint.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = usdc_program,
    )]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,

    pub usdc_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Wrap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, mint::authority = vault_authority, mint::token_program = payroll_program)]
    pub payroll_mint: InterfaceAccount<'info, Mint>,
    #[account(mint::token_program = usdc_program)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA signer for the mint.
    #[account(seeds = [VAULT_SEED, payroll_mint.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = usdc_program,
    )]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = usdc_mint, token::authority = user, token::token_program = usdc_program)]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,

    /// The user's payroll token account. Must already exist (it is created and
    /// configured for confidential transfers by the client).
    #[account(mut, token::mint = payroll_mint, token::authority = user, token::token_program = payroll_program)]
    pub user_payroll: InterfaceAccount<'info, TokenAccount>,

    pub usdc_program: Interface<'info, TokenInterface>,
    pub payroll_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Unwrap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, mint::authority = vault_authority, mint::token_program = payroll_program)]
    pub payroll_mint: InterfaceAccount<'info, Mint>,
    #[account(mint::token_program = usdc_program)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA signer for the vault's USDC account.
    #[account(seeds = [VAULT_SEED, payroll_mint.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = usdc_program,
    )]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = usdc_mint,
        associated_token::authority = user,
        associated_token::token_program = usdc_program,
    )]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = payroll_mint, token::authority = user, token::token_program = payroll_program)]
    pub user_payroll: InterfaceAccount<'info, TokenAccount>,

    pub usdc_program: Interface<'info, TokenInterface>,
    pub payroll_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct VaultInitialized {
    pub payroll_mint: Pubkey,
    pub vault_usdc: Pubkey,
}

#[event]
pub struct Wrapped {
    pub payroll_mint: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Unwrapped {
    pub payroll_mint: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum VaultError {
    #[msg("The payroll mint's authority must be the vault PDA")]
    MintAuthorityMismatch,
    #[msg("Payroll mint and USDC must have the same decimals")]
    DecimalsMismatch,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
}
