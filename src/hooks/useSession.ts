"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { getBase64Decoder } from "@solana/kit";
import { buildSignInMessage } from "@/lib/auth/siws";
import { endSession, SESSION_ENDED } from "@/lib/auth/clientSession";

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; address: string };

async function fetchSession(): Promise<SessionState> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  const data = (await res.json()) as { address: string | null };
  return data.address ? { status: "authenticated", address: data.address } : { status: "anonymous" };
}

/** Server session state plus sign-in and sign-out actions. */
export function useSession() {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((s) => {
      if (!cancelled) setState(s);
    });
    // Disconnecting from any wallet menu ends the session; reflect it here even
    // when this hook did not initiate it (e.g. the menu on an invite page).
    const onEnded = () => setState({ status: "anonymous" });
    window.addEventListener(SESSION_ENDED, onEnded);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_ENDED, onEnded);
    };
  }, []);

  const signOut = useCallback(async () => {
    await endSession();
    setState({ status: "anonymous" });
  }, []);

  const setAuthenticated = useCallback((address: string) => setState({ status: "authenticated", address }), []);

  return { state, signOut, setAuthenticated };
}

/**
 * Performs sign-in for a specific account. Kept separate from `useSession`
 * because the message-signing hook needs the account at hook time.
 */
export function useSignIn(account: UiWalletAccount) {
  const signMessage = useSignMessage(account);

  return useCallback(async (): Promise<string> => {
    const { nonce } = (await (await fetch("/api/auth/nonce", { method: "POST" })).json()) as { nonce: string };
    const message = buildSignInMessage({
      domain: window.location.host,
      address: account.address,
      nonce,
      issuedAt: new Date().toISOString(),
    });
    const { signature } = await signMessage({ message: new TextEncoder().encode(message) });
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, signature: getBase64Decoder().decode(signature) }),
    });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({ error: "Sign-in failed" }))) as { error: string };
      throw new Error(error);
    }
    return account.address;
  }, [account, signMessage]);
}
