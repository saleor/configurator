import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { deployCommandSchema } from "../commands/deploy";
import { diffCommandSchema } from "../commands/diff";
import {
  createCommand,
  isBooleanField,
  mergeEnvArgs,
  shouldOutputJson,
  toKebabCase,
} from "./command";

const VALID_ARGS = ["--url", "https://example.saleor.cloud/graphql/", "--token", "test-token"];

async function parseWithCommand<T extends z.ZodObject<Record<string, z.ZodTypeAny>>>(
  schema: T,
  argv: string[]
): Promise<z.infer<T>> {
  const handler = vi.fn();
  const command = createCommand({ name: "test", description: "test", schema, handler });
  command.exitOverride();
  await command.parseAsync(argv, { from: "user" });
  expect(handler).toHaveBeenCalledTimes(1);
  return handler.mock.calls[0][0];
}

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

describe("shouldOutputJson", () => {
  it("returns true when --json flag is set", () => {
    expect(shouldOutputJson({ json: true })).toBe(true);
  });

  it("returns false when --text flag is set even in non-TTY", () => {
    expect(shouldOutputJson({ text: true })).toBe(false);
  });

  it("returns true in non-TTY when no explicit flag", () => {
    // Test environment is non-TTY, so this should be true
    expect(shouldOutputJson({})).toBe(true);
  });
});

describe("isBooleanField", () => {
  it.each([
    ["plain boolean", z.boolean()],
    ["boolean with default", z.boolean().default(false)],
    ["optional boolean", z.boolean().optional()],
    ["optional boolean with default", z.boolean().optional().default(false)],
  ])("detects %s", (_label, field) => {
    expect(isBooleanField(field)).toBe(true);
  });

  it("does not treat non-boolean fields as booleans", () => {
    expect(isBooleanField(z.string().optional())).toBe(false);
    expect(isBooleanField(z.string().default("x"))).toBe(false);
  });
});

describe("createCommand boolean options", () => {
  it("registers optional-with-default booleans as value-less flags", () => {
    const command = createCommand({
      name: "deploy",
      description: "test",
      schema: deployCommandSchema,
      handler: vi.fn(),
    });
    const verbose = command.options.find((option) => option.attributeName() === "verbose");
    expect(verbose?.flags).toBe("--verbose");
  });

  it("parses deploy --verbose as true without consuming the next flag", async () => {
    const args = await parseWithCommand(deployCommandSchema, ["--verbose", ...VALID_ARGS]);
    expect(args.verbose).toBe(true);
    expect(args.url).toBe("https://example.saleor.cloud/graphql/");
  });

  it("defaults deploy verbose to false", async () => {
    const args = await parseWithCommand(deployCommandSchema, VALID_ARGS);
    expect(args.verbose).toBe(false);
  });
});

describe("createCommand flag naming", () => {
  it("converts camelCase schema keys to kebab-case flags", () => {
    expect(toKebabCase("failOnDelete")).toBe("fail-on-delete");
    expect(toKebabCase("url")).toBe("url");
  });

  it("shows only kebab-case flags in help", () => {
    const command = createCommand({
      name: "diff",
      description: "test",
      schema: diffCommandSchema,
      handler: vi.fn(),
    });
    const help = command.helpInformation();
    expect(help).toContain("--fail-on-delete");
    expect(help).toContain("--output-file <output-file>");
    expect(help).not.toContain("--failOnDelete");
  });

  it.each([
    ["kebab-case", ["--fail-on-delete", "--skip-media", "--report-path", "r.json"]],
    ["camelCase", ["--failOnDelete", "--skipMedia", "--reportPath", "r.json"]],
  ])("accepts %s deploy flags", async (_label, flags) => {
    const args = await parseWithCommand(deployCommandSchema, [...flags, ...VALID_ARGS]);
    expect(args.failOnDelete).toBe(true);
    expect(args.skipMedia).toBe(true);
    expect(args.reportPath).toBe("r.json");
  });

  it.each([
    [
      "kebab-case",
      [
        "--github-comment",
        "--fail-on-breaking",
        "--output-file",
        "o.md",
        "--entity-type",
        "Categories",
      ],
    ],
    [
      "camelCase",
      ["--githubComment", "--failOnBreaking", "--outputFile", "o.md", "--entityType", "Categories"],
    ],
  ])("accepts %s diff flags", async (_label, flags) => {
    const args = await parseWithCommand(diffCommandSchema, [...flags, ...VALID_ARGS]);
    expect(args.githubComment).toBe(true);
    expect(args.failOnBreaking).toBe(true);
    expect(args.outputFile).toBe("o.md");
    expect(args.entityType).toBe("Categories");
  });
});
