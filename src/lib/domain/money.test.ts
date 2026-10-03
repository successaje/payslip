import { describe, expect, it } from "vitest";
import { formatUsd, parseUsd, sum, toBaseUnits } from "./money";

describe("parseUsd", () => {
  it("parses whole and fractional dollars", () => {
    expect(parseUsd("2,350.00")).toBe(2_350_000_000n);
    expect(parseUsd("$1")).toBe(1_000_000n);
    expect(parseUsd("0.5")).toBe(500_000n);
    expect(parseUsd("12.345678")).toBe(12_345_678n);
  });
  it("rejects malformed input", () => {
    expect(() => parseUsd("")).toThrow();
    expect(() => parseUsd("abc")).toThrow();
    expect(() => parseUsd("1.2345678")).toThrow();
  });
});

describe("formatUsd", () => {
  it("formats base units with two decimals and grouping", () => {
    expect(formatUsd(2_350_000_000n)).toBe("$2,350.00");
    expect(formatUsd(500_000n)).toBe("$0.50");
    expect(formatUsd("1234567")).toBe("$1.23");
    expect(formatUsd(-1_000_000n)).toBe("-$1.00");
    expect(formatUsd(1_000_000n, { sign: false })).toBe("1.00");
  });
});

describe("toBaseUnits / sum", () => {
  it("converts numbers and sums", () => {
    expect(toBaseUnits(1.5)).toBe(1_500_000n);
    expect(sum([1n, 2n, 3n])).toBe(6n);
  });
});
