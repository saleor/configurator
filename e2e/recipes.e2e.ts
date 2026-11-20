import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type CliRun, runCli } from "./lib/cli";
import { installCli, packCheckout } from "./lib/package";
import { workspace } from "./lib/store";

const MANIFEST = path.join(import.meta.dirname, "..", "src", "recipes", "manifest.json");

const parseJson = <T>(run: CliRun): T => {
  try {
    return JSON.parse(run.stdout) as T;
  } catch {
    throw new Error(
      `recipe exited ${run.exitCode} without JSON.\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`
    );
  }
};

/** Runs against the packed package installed from its tarball, what users get from npm. */
describe("recipes in the published package", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as { recipes: { name: string }[] };
  let dir: string;
  let bin: string;

  beforeAll(() => {
    dir = workspace("recipes");
    bin = installCli(path.join(dir, "install"), packCheckout(path.join(dir, "pack")));
  });

  // Known bug: the bundled CLI resolves the recipes directory outside the package, so every
  // `recipe` subcommand fails with ENOENT on `recipes/manifest.json`.
  it.fails("lists every recipe in the manifest", () => {
    const list = parseJson<{ recipes: { name: string }[] }>(
      runCli(["recipe", "list", "--json"], { cwd: dir, bin })
    );
    expect(list.recipes.map((recipe) => recipe.name)).toEqual(
      manifest.recipes.map((recipe) => recipe.name)
    );
  });

  // Known bug: as above.
  it.fails("shows a recipe's metadata and config", () => {
    const [first] = manifest.recipes;
    const show = parseJson<{ metadata: { name: string }; config: Record<string, unknown> }>(
      runCli(["recipe", "show", first.name, "--json"], { cwd: dir, bin })
    );
    expect(show.metadata.name).toBe(first.name);
    expect(Object.keys(show.config).length).toBeGreaterThan(0);
  });
});
