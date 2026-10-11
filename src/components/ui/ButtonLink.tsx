"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./Button";

/** A navigation link styled as a button. Use instead of nesting <Button> inside <Link>. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  block,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    block?: boolean;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
    children: ReactNode;
  }) {
  return (
    <Link className={buttonClass({ variant, size, block, className })} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}
