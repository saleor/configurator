import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initCommandConfig, type InitCommandArgs } from "./init";

async function createWorkspace(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "configurator-init-"));
}

describe("init command", () => {
  it("scaffolds a TypeScript configuration", async () => {
    const workspace = await createWorkspace();
    const dir = path.join(workspace, "config");

    const args: InitCommandArgs = {
      dir,
      force: true,
      layout: "sections",
      quiet: true,
    };

    await initCommandConfig.handler(args);

    const stack = await readFile(path.join(dir, "stack.ts"), "utf-8");
    expect(stack).toContain("defineStack");

    const catalog = await readFile(path.join(dir, "sections", "catalog.ts"), "utf-8");
    expect(catalog).toContain("buildCatalog");

    await rm(workspace, { recursive: true, force: true });
  });
});
