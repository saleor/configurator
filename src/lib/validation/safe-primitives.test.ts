import path from "node:path";
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

  it("allows file names containing consecutive dots", () => {
    expect(safePath().parse("my..config.yml")).toBe("my..config.yml");
    expect(safePath().parse("configs/v1..2/config.yml")).toBe(
      path.normalize("configs/v1..2/config.yml")
    );
  });

  it("rejects relative paths that escape via .. segments", () => {
    expect(() => safePath().parse("configs/../../config.yml")).toThrow();
    expect(() => safePath().parse("..")).toThrow();
  });

  it("allows absolute paths inside CWD", () => {
    const inside = path.join(process.cwd(), "configs", "config.yml");
    expect(safePath().parse(inside)).toBe(inside);
  });

  it("rejects absolute paths in sibling directories sharing the CWD prefix", () => {
    const sibling = `${process.cwd()}2${path.sep}config.yml`;
    expect(() => safePath().parse(sibling)).toThrow();
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

  it.each([
    "http://localhost:8000/graphql/",
    "http://127.0.0.1:8000/graphql/",
    "http://[::1]:8000/graphql/",
  ])("accepts plain HTTP for loopback host %s", (url) => {
    expect(saleorUrl().parse(url)).toBe(url);
  });

  it.each([
    "http://localhost.evil.com/graphql/",
    "http://127.0.0.2/graphql/",
    "ftp://localhost/graphql/",
  ])("rejects non-HTTPS URL %s on non-loopback hosts or protocols", (url) => {
    expect(() => saleorUrl().parse(url)).toThrow();
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
