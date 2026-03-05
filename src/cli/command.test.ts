import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeEnvArgs } from "./command";

describe("mergeEnvArgs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses SALEOR_URL when url is undefined in args", () => {
    vi.stubEnv("SALEOR_URL", "https://env.saleor.cloud/graphql/");
    const result = mergeEnvArgs({ url: undefined, token: "tok" });
    expect(result.url).toBe("https://env.saleor.cloud/graphql/");
  });

  it("CLI url flag overrides SALEOR_URL", () => {
    vi.stubEnv("SALEOR_URL", "https://env.saleor.cloud/graphql/");
    const result = mergeEnvArgs({ url: "https://cli.saleor.cloud/graphql/", token: "tok" });
    expect(result.url).toBe("https://cli.saleor.cloud/graphql/");
  });

  it("uses SALEOR_TOKEN when token is undefined in args", () => {
    vi.stubEnv("SALEOR_TOKEN", "env-token-123");
    const result = mergeEnvArgs({ url: "https://example.com/graphql/", token: undefined });
    expect(result.token).toBe("env-token-123");
  });

  it("uses SALEOR_CONFIG when config is undefined in args", () => {
    vi.stubEnv("SALEOR_CONFIG", "/path/to/env-config.yml");
    const result = mergeEnvArgs({
      url: "https://example.com/graphql/",
      token: "tok",
      config: undefined,
    });
    expect(result.config).toBe("/path/to/env-config.yml");
  });

  it("CLI token flag overrides SALEOR_TOKEN", () => {
    vi.stubEnv("SALEOR_TOKEN", "env-token-123");
    const result = mergeEnvArgs({ url: "https://example.com/graphql/", token: "cli-token" });
    expect(result.token).toBe("cli-token");
  });

  it("CLI config flag overrides SALEOR_CONFIG", () => {
    vi.stubEnv("SALEOR_CONFIG", "/path/to/env-config.yml");
    const result = mergeEnvArgs({
      url: "https://example.com/graphql/",
      token: "tok",
      config: "cli-config.yml",
    });
    expect(result.config).toBe("cli-config.yml");
  });

  it("returns args unchanged when no env vars are set", () => {
    const args = { url: "https://example.com/graphql/", token: "tok", config: "config.yml" };
    const result = mergeEnvArgs(args);
    expect(result).toEqual(args);
  });
});
