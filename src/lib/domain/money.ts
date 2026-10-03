/**
 * Money helpers. Amounts are stored and transmitted as base units of a
 * 6-decimal token (USDC and the payroll token), as bigint or decimal string.
 */

export const DECIMALS = 6;
const SCALE = 10n ** BigInt(DECIMALS);

export function toBaseUnits(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Amount must be finite");
    return BigInt(Math.round(value * Number(SCALE)));
  }
  const s = value.trim();
  if (!/^\d+$/.test(s)) throw new Error("Base units must be an integer string");
  return BigInt(s);
}

/** Parses a user-typed dollar amount like "2,350.50" into base units. */
export function parseUsd(input: string): bigint {
  const cleaned = input.replace(/[,$\s_]/g, "");
  if (!/^\d*(\.\d{0,6})?$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    throw new Error("Enter an amount like 2,350.00");
  }
  const [whole = "0", frac = ""] = cleaned.split(".");
  return BigInt(whole) * SCALE + BigInt(frac.padEnd(DECIMALS, "0"));
}

/** Formats base units as "$2,350.00". */
export function formatUsd(value: bigint | number | string, { sign = true }: { sign?: boolean } = {}): string {
  const base = toBaseUnits(value);
  const negative = base < 0n;
  const abs = negative ? -base : base;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(DECIMALS, "0").slice(0, 2);
  const wholeStr = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${sign ? "$" : ""}${wholeStr}.${frac}`;
}

export function sum(values: Iterable<bigint>): bigint {
  let t = 0n;
  for (const v of values) t += v;
  return t;
}
