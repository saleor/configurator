import { describe, expect, it } from "vitest";
import { safeIdentifier, safePath, safeString, safeToken, saleorUrl } from "./safe-primitives";

describe("safePath", () => {
  it("normalizes paths", () => {
    expect(safePath().parse("./config.yml")).toBe("config.yml");
  });

  it("rejects path traversal", () => {
    expect(() => safePath().parse("../../etc/passwd")).toThrow();
  });

  it("rejects absolute paths outside CWD", () => {
    expect(() => safePath().parse("/etc/passwd")).toThrow();
  });

  it("allows paths within CWD", () => {
    expect(() => safePath().parse("configs/staging.yml")).not.toThrow();
  });
});

describe("saleorUrl", () => {
  it("accepts valid Saleor URLs", () => {
    expect(saleorUrl().parse("https://store.saleor.cloud/graphql/")).toBe(
      "https://store.saleor.cloud/graphql/"
    );
  });

  it("appends trailing slash if missing", () => {
    expect(saleorUrl().parse("https://store.saleor.cloud/graphql")).toBe(
      "https://store.saleor.cloud/graphql/"
    );
  });

  it("rejects non-HTTPS URLs", () => {
    expect(() => saleorUrl().parse("http://store.saleor.cloud/graphql/")).toThrow();
  });

  it("rejects URLs without /graphql endpoint", () => {
    expect(() => saleorUrl().parse("https://store.saleor.cloud/")).toThrow();
  });

  it("rejects URLs with query parameters", () => {
    expect(() => saleorUrl().parse("https://store.saleor.cloud/graphql/?admin=true")).toThrow();
  });
});

describe("safeString", () => {
  it("strips control characters", () => {
    expect(safeString().parse("hello\x00world\x1f")).toBe("helloworld");
  });

  it("preserves normal strings", () => {
    expect(safeString().parse("normal string")).toBe("normal string");
  });
});

describe("safeIdentifier", () => {
  it("rejects ? in identifiers", () => {
    expect(() => safeIdentifier().parse("slug?param=1")).toThrow();
  });

  it("rejects # in identifiers", () => {
    expect(() => safeIdentifier().parse("slug#fragment")).toThrow();
  });

  it("rejects % in identifiers", () => {
    expect(() => safeIdentifier().parse("slug%20encoded")).toThrow();
  });

  it("accepts valid slugs", () => {
    expect(safeIdentifier().parse("my-product-slug")).toBe("my-product-slug");
  });
});

describe("safeToken", () => {
  it("rejects empty tokens", () => {
    expect(() => safeToken().parse("")).toThrow();
  });

  it("rejects tokens with whitespace", () => {
    expect(() => safeToken().parse("token with spaces")).toThrow();
  });

  it("strips control characters from tokens", () => {
    expect(safeToken().parse("validtoken\n")).toBe("validtoken");
  });

  it("accepts valid tokens", () => {
    expect(safeToken().parse("YbE8g7ZNl0xyz")).toBe("YbE8g7ZNl0xyz");
  });
});
