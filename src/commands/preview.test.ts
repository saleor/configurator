import { describe, expect, it, vi } from "vitest";
import { previewCommandConfig, type PreviewCommandArgs } from "./preview";
import * as diffModule from "./diff";

const statusSpy = vi.fn();

vi.mock("../cli/console", () => ({
  Console: vi.fn().mockImplementation(() => ({
    setOptions: vi.fn(),
    status: statusSpy,
  })),
}));

vi.mock("./diff", () => ({
  handleDiff: vi.fn().mockResolvedValue(undefined),
}));

describe("preview command", () => {
  it("normalizes configuration path to TypeScript", async () => {
    const args: PreviewCommandArgs = {
      config: "config.yml",
      url: "https://example.saleor.cloud/graphql/",
      token: "token",
      quiet: false,
    };

    await previewCommandConfig.handler(args);

    expect(diffModule.handleDiff).toHaveBeenCalledWith(
      expect.objectContaining({ config: "config.ts" })
    );
    expect(statusSpy).toHaveBeenCalledWith(
      "🔮 Previewing TypeScript configuration changes (no remote mutations)"
    );
  });
});
