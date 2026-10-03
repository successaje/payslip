"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "./Button";

export function CopyButton({ value, children, ...props }: { value: string } & Omit<ButtonProps, "onClick" | "value">) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      {...props}
      leadingIcon={copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : children}
    </Button>
  );
}
