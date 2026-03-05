import { describe, expect, it } from "vitest";
import { extractStoreIdentifier, generateReportPath } from "./report-storage";

describe("extractStoreIdentifier", () => {
  it("extracts store ID from standard Saleor URL", () => {
    expect(extractStoreIdentifier("https://store-rzalldyg.saleor.cloud/graphql/")).toBe(
      "store-rzalldyg"
    );
  });

  it("extracts hostname for custom domains", () => {
    expect(extractStoreIdentifier("https://api.myshop.com/graphql/")).toBe("api.myshop.com");
  });

  it("returns 'unknown' for invalid URLs", () => {
    expect(extractStoreIdentifier("not-a-url")).toBe("unknown");
  });
});

describe("generateReportPath", () => {
  it("creates path with command subdirectory", () => {
    const result = generateReportPath("deploy", "https://store-rzalldyg.saleor.cloud/graphql/");
    expect(result).toMatch(
      /\.configurator\/reports\/deploy\/store-rzalldyg_\d{4}-\d{2}-\d{2}_\d{2}h\d{2}m\d{2}s\.json$/
    );
  });

  it("creates path for diff command", () => {
    const result = generateReportPath("diff", "https://store-rzalldyg.saleor.cloud/graphql/");
    expect(result).toContain("/reports/diff/");
  });

  it("uses readable time format", () => {
    const result = generateReportPath("deploy", "https://store-rzalldyg.saleor.cloud/graphql/");
    // Should contain HHhMMmSSs format
    expect(result).toMatch(/\d{2}h\d{2}m\d{2}s/);
  });
});
