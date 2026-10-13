"use client";

/** Fired on window after the server session has been cleared, so every session hook resets. */
export const SESSION_ENDED = "payslip:session-ended";

/** Clears the sign-in cookie and tells the app. Safe to call more than once. */
export async function endSession(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } finally {
    window.dispatchEvent(new Event(SESSION_ENDED));
  }
}
