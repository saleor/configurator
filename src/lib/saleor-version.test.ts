import { describe, expect, it } from "vitest";
import { getSaleorMinor, isSaleorMinorMismatch } from "./saleor-version";

describe("Saleor version helpers", () => {
  it("extracts a minor version from Saleor version strings", () => {
    expect(getSaleorMinor("3.23")).toBe("3.23");
    expect(getSaleorMinor("3.23.0")).toBe("3.23");
    expect(getSaleorMinor("3.23.4-a")).toBe("3.23");
  });

  it("does not treat patch differences as a mismatch", () => {
    expect(isSaleorMinorMismatch("3.23.7", "3.23")).toBe(false);
  });

  it("treats different minors as a mismatch", () => {
    expect(isSaleorMinorMismatch("3.22.9", "3.23")).toBe(true);
    expect(isSaleorMinorMismatch("3.24.0", "3.23")).toBe(true);
  });

  it("ignores missing or unparseable versions", () => {
    expect(getSaleorMinor(undefined)).toBeUndefined();
    expect(getSaleorMinor("main")).toBeUndefined();
    expect(isSaleorMinorMismatch(undefined, "3.23")).toBe(false);
    expect(isSaleorMinorMismatch("main", "3.23")).toBe(false);
  });
});
