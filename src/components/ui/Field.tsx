"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldShellProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Right-aligned content next to the label, e.g. "Optional". */
  labelAside?: ReactNode;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function FieldShell({ label, hint, error, labelAside, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || labelAside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={id} className="text-[13px] font-medium text-ink">
              {label}
            </label>
          )}
          {labelAside && <span className="text-[12px] text-ink-3">{labelAside}</span>}
        </div>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="text-[12.5px] text-red">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[12.5px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-10 w-full rounded-[var(--radius-md)] border border-line-strong bg-paper-raised px-3 text-[14px] text-ink " +
  "placeholder:text-ink-4 transition-[border-color,box-shadow] duration-[var(--dur-fast)] " +
  "hover:border-ink-4 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 " +
  "disabled:bg-paper-sunken disabled:text-ink-3 aria-invalid:border-red aria-invalid:focus:ring-red/15";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  labelAside?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  mono?: boolean;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, labelAside, leading, trailing, mono, className, wrapperClassName, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} labelAside={labelAside} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          {leading && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3">{leading}</span>
          )}
          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(inputClass, leading && "pl-9", trailing && "pr-10", mono && "font-mono tnum", className)}
            {...rest}
          />
          {trailing && <span className="absolute inset-y-0 right-3 flex items-center text-ink-3">{trailing}</span>}
        </div>
      )}
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  labelAside?: ReactNode;
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, labelAside, mono, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} labelAside={labelAside}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(inputClass, "h-auto min-h-28 py-2.5 leading-relaxed", mono && "font-mono text-[13px]", className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
});
