import { mkdirSync, rmSync, statSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execa } from "execa";
import * as yaml from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.SALEOR_URL; // normalized to /graphql/
const TOKEN = process.env.TOKEN;

function toGraphqlUrl(base: string): string {
  const hasGraphql = base.includes("/graphql");
  if (hasGraphql) return base.endsWith("/") ? base : `${base}/`;
  const url = new URL(base.endsWith("/") ? base : `${base}/`);
  return new URL("graphql/", url).toString();
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

describe("E2E: introspect smoke", () => {
  const tmpDir = resolve(__dirname, "./.tmp");
  const configPath = resolve(tmpDir, "config.e2e.yml");

  beforeAll(() => {
    ensureDir(tmpDir);
    try {
      rmSync(configPath, { force: true });
    } catch {}
  });

  afterAll(() => {
    // Keep artifacts for CI debugging; do not delete tmpDir
  });

  it("writes a config file via introspect", async () => {
    if (!BASE_URL || !TOKEN) {
      throw new Error(
        "Missing SALEOR_URL/TOKEN env. Set GitHub secrets or export envs locally."
      );
    }
    const url = toGraphqlUrl(BASE_URL);

    const { stdout } = await execa(
      "pnpm",
      [
        "dev",
        "introspect",
        `--url=${url}`,
        `--token=${TOKEN}`,
        `--config=${configPath}`
      ],
      { stdio: "pipe" }
    );

    // Basic assertions
    expect(() => statSync(configPath)).not.toThrow();
    const raw = readFileSync(configPath, "utf8");
    const parsed = yaml.parse(raw);
    // Expect essential top-level keys; tolerate shape differences
    expect(parsed).toBeTruthy();
    expect(typeof parsed).toBe("object");
    expect(Object.keys(parsed!).length).toBeGreaterThan(0);

    // Helpful hint if something goes wrong
    expect(stdout).toMatch(/Configuration|Introspect|Fetching/i);
  }, 120_000);
});
