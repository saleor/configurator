import { describe, expect, it } from "vitest";
import { getPackageVersion, getSupportedSaleorMinor } from "./package-info";

describe("package info", () => {
  it("reads the package version", () => {
    expect(getPackageVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("reads the supported Saleor minor from package metadata", () => {
    expect(getSupportedSaleorMinor()).toBe("3.23");
  });
});
