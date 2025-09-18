import { describe, expect, it } from "vitest";
import { createConfigurationManager } from "./configuration-manager";
import { TypeScriptConfigurationManager } from "./ts-manager";
import { YamlConfigurationManager } from "./yaml-manager";

describe("createConfigurationManager", () => {
  it("returns the TypeScript manager for .ts files", () => {
    const manager = createConfigurationManager("config.ts");
    expect(manager).toBeInstanceOf(TypeScriptConfigurationManager);
  });

  it("returns the TypeScript manager for precompiled JavaScript files", () => {
    const manager = createConfigurationManager("config.mjs");
    expect(manager).toBeInstanceOf(TypeScriptConfigurationManager);
  });

  it("returns the YAML manager for non-TypeScript files", () => {
    const manager = createConfigurationManager("config.yml");
    expect(manager).toBeInstanceOf(YamlConfigurationManager);
  });
});
