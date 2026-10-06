import { describe, expect, it } from "vitest";
import { parseCsv, previewImport } from "./csvImport";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and blank lines", () => {
    const rows = parseCsv('name,role\r\n"Okafor, Ada","Lead ""design"""\r\n\r\nTunde,Docs\n');
    expect(rows).toEqual([
      ["name", "role"],
      ["Okafor, Ada", 'Lead "design"'],
      ["Tunde", "Docs"],
    ]);
  });
  it("detects semicolon and tab delimiters", () => {
    expect(parseCsv("a;b;c\n1;2;3")[1]).toEqual(["1", "2", "3"]);
    expect(parseCsv("a\tb\n1\t2")[1]).toEqual(["1", "2"]);
  });
});

describe("previewImport", () => {
  it("maps aliased headers in any order and totals valid rows", () => {
    const p = previewImport('Amount,Full name,Label,E-mail\n"$2,350.00",Ada Okafor,Designer,ada@x.io\n750,Tunde Bello,Bounty #42,');
    expect(p.header).not.toBeNull();
    expect(p.valid).toHaveLength(2);
    expect(p.valid[0]).toMatchObject({ name: "Ada Okafor", email: "ada@x.io", role: "Designer", amountBase: 2_350_000_000n });
    expect(p.total).toBe(3_100_000_000n);
  });
  it("accepts headerless name,email,role,amount and name,role,amount", () => {
    expect(previewImport("Ada,ada@x.io,Design,100").valid[0]).toMatchObject({ email: "ada@x.io", role: "Design", amountBase: 100_000_000n });
    expect(previewImport("Ada,Design,100").valid[0]).toMatchObject({ email: "", role: "Design", amountBase: 100_000_000n });
  });
  it("reports row errors with line numbers and keeps going", () => {
    const p = previewImport("name,amount\nAda,abc\n,50\nBob,0\nCara,10");
    expect(p.invalid.map((r) => [r.line, r.errors[0]])).toEqual([
      [2, "Amount is not a number"],
      [3, "Missing name"],
      [4, "Amount must be above zero"],
    ]);
    expect(p.valid.map((r) => r.name)).toEqual(["Cara"]);
  });
  it("flags duplicates within the file and against the roster", () => {
    const p = previewImport("name,email,amount\nAda,ada@x.io,1\nAda Okafor,ADA@x.io,2\nTunde,,3\nTunde,,4", [{ name: "Ada", email: "ada@x.io" }]);
    expect(p.rows[0].errors).toContain("Already on the roster as Ada");
    expect(p.rows[1].errors).toContain("Already on the roster as Ada");
    expect(p.rows[3].errors).toContain("Repeated in this file");
    expect(p.valid.map((r) => r.name)).toEqual(["Tunde"]);
  });
  it("returns an empty preview for empty input", () => {
    expect(previewImport("  \n")).toMatchObject({ rows: [], total: 0n, header: null });
  });
});
