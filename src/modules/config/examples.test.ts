import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { runPreflightValidation } from "../../core/validation/preflight";
import { checkConfiguration } from "./check-configuration";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function yamlFilesIn(directory: string): string[] {
  return readdirSync(path.join(repoRoot, directory), { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".yml"))
    .map((file) => path.join(directory, file));
}

const exampleFiles = [
  "example.yml",
  ...yamlFilesIn("recipes"),
  ...yamlFilesIn("skills/configurator-recipes/templates"),
  ...yamlFilesIn("plugin/skills/configurator-recipes/templates"),
];

describe("example configurations", () => {
  it.each(exampleFiles)("%s passes validation and deploy checks with no unknown keys", (file) => {
    const result = checkConfiguration(parse(readFileSync(path.join(repoRoot, file), "utf8")));

    expect(result.success ? [] : result.error.issues).toEqual([]);
    if (!result.success) return;
    expect(result.unknownKeys).toEqual([]);
    expect(() => runPreflightValidation(result.data, file)).not.toThrow();
  });
});
