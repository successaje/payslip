import { describe, expect, it } from "vitest";
import { canTransition, deriveRunStatus, paymentsToAttempt } from "./payroll";

describe("deriveRunStatus", () => {
  it("is draft with no payments or all pending", () => {
    expect(deriveRunStatus([])).toBe("draft");
    expect(deriveRunStatus(["pending", "pending"])).toBe("draft");
  });
  it("is running while anything is in flight", () => {
    expect(deriveRunStatus(["paid", "signing"])).toBe("running");
    expect(deriveRunStatus(["pending", "confirming"])).toBe("running");
  });
  it("is completed, partial or failed once settled", () => {
    expect(deriveRunStatus(["paid", "paid"])).toBe("completed");
    expect(deriveRunStatus(["paid", "failed"])).toBe("partial");
    expect(deriveRunStatus(["failed", "failed"])).toBe("failed");
  });
  it("is running when some are paid and others still pending", () => {
    expect(deriveRunStatus(["paid", "pending"])).toBe("running");
  });
});

describe("paymentsToAttempt", () => {
  it("retries failed and pending only", () => {
    const list = [{ status: "paid" }, { status: "failed" }, { status: "pending" }, { status: "signing" }] as const;
    expect(paymentsToAttempt([...list]).map((p) => p.status)).toEqual(["failed", "pending"]);
  });
});

describe("canTransition", () => {
  it("moves forward only and never out of paid", () => {
    expect(canTransition("pending", "preparing")).toBe(true);
    expect(canTransition("preparing", "signing")).toBe(true);
    expect(canTransition("signing", "preparing")).toBe(false);
    expect(canTransition("paid", "failed")).toBe(false);
    expect(canTransition("confirming", "failed")).toBe(true);
    expect(canTransition("failed", "preparing")).toBe(true);
    expect(canTransition("failed", "pending")).toBe(true);
  });
});
