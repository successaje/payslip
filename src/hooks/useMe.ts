"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Me } from "@/lib/api/client";

export type MeState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; me: Me };

/** Who the signed-in wallet is to Payslip: owned companies and employee memberships. */
export function useMe(enabled: boolean) {
  const [state, setState] = useState<MeState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setState({ status: "ready", me });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Could not load your account" });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api
      .me()
      .then((me) => !cancelled && setState({ status: "ready", me }))
      .catch((e) => !cancelled && setState({ status: "error", message: e instanceof Error ? e.message : "Could not load" }));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { state, refresh };
}
