"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button while keeping its width stable. */
  loading?: boolean;
  /** Replaces children while loading, e.g. "Signing…". */
  loadingLabel?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  block?: boolean;
}

const base =
  "relative inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-medium " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] " +
  "disabled:opacity-50 active:enabled:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:enabled:bg-ink-2 dark:hover:enabled:bg-ink-2 shadow-[var(--shadow-sm)]",
  secondary:
    "bg-paper-raised text-ink border border-line-strong hover:enabled:bg-paper-sunken shadow-[var(--shadow-sm)]",
  ghost: "bg-transparent text-ink-2 hover:enabled:bg-paper-inset hover:enabled:text-ink",
  danger: "bg-red text-white hover:enabled:brightness-95 shadow-[var(--shadow-sm)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-[14px] rounded-[var(--radius-md)]",
  lg: "h-12 px-5 text-[15px] rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingLabel,
    leadingIcon,
    trailingIcon,
    block,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size={size === "sm" ? 14 : 16} />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        <>
          {leadingIcon && <span className="-ml-0.5 inline-flex shrink-0">{leadingIcon}</span>}
          <span>{children}</span>
          {trailingIcon && <span className="-mr-0.5 inline-flex shrink-0">{trailingIcon}</span>}
        </>
      )}
    </button>
  );
});
