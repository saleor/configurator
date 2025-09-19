import { describe, expect, it, vi } from "vitest";
import type { DuplicateIssue } from "../../core/validation/preflight";
import { Console } from "../console";
import { printDuplicateIssues } from "./duplicates";

describe("printDuplicateIssues", () => {
  it("prints a friendly summary with fix hints", () => {
    // Arrange
    const c = new Console();
    const warnSpy = vi.spyOn(c, "warn");
    const infoSpy = vi.spyOn(c, "info");
    const textSpy = vi.spyOn(c, "text");
    const issues: DuplicateIssue[] = [
      { section: "products", identifier: "dup-slug", count: 2, label: "product slug" },
      { section: "channels", identifier: "default", count: 2, label: "channel slug" },
    ];

    // Act
    printDuplicateIssues(issues, c, "config.yml");

    // Assert (AAA)
    expect(warnSpy).toHaveBeenCalled();
    expect(textSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });
});
