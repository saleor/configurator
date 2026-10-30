import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfigurator } from "../core/configurator";
import { createRecipeCommand } from "./recipe";

vi.mock("../core/configurator", () => ({ createConfigurator: vi.fn() }));
vi.mock("../modules/recipe/recipe-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../modules/recipe/recipe-service")>()),
  loadRecipeConfig: vi.fn(() => ({ metadata: { name: "test" }, config: {} })),
}));

describe("recipe apply credentials", () => {
  beforeEach(() => {
    vi.stubEnv("SALEOR_URL", "https://env.saleor.cloud/graphql/");
    vi.stubEnv("SALEOR_TOKEN", "env-token-123");
    vi.mocked(createConfigurator).mockReturnValue({
      diff: vi.fn().mockResolvedValue({ summary: { totalChanges: 0 } }),
    } as unknown as ReturnType<typeof createConfigurator>);
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    { flags: [], url: "https://env.saleor.cloud/graphql/", token: "env-token-123" },
    {
      flags: ["--url", "https://cli.saleor.cloud/graphql/"],
      url: "https://cli.saleor.cloud/graphql/",
      token: "env-token-123",
    },
    {
      flags: ["--token", "cli-token-123"],
      url: "https://env.saleor.cloud/graphql/",
      token: "cli-token-123",
    },
    {
      flags: ["--url", "https://cli.saleor.cloud/graphql/", "--token", "cli-token-123"],
      url: "https://cli.saleor.cloud/graphql/",
      token: "cli-token-123",
    },
  ])("accepts credentials with $flags", async ({ flags, url, token }) => {
    await createRecipeCommand()
      .exitOverride()
      .parseAsync(["apply", "test", "--json", ...flags], { from: "user" });
    expect(createConfigurator).toHaveBeenCalledWith(expect.objectContaining({ url, token }));
  });

  it.each(["SALEOR_URL", "SALEOR_TOKEN"])("still requires missing %s", async (variable) => {
    vi.stubEnv(variable, undefined);
    const command = createRecipeCommand().exitOverride();
    for (const subcommand of command.commands) {
      subcommand.exitOverride().configureOutput({ writeErr: () => {} });
    }
    await expect(
      command.parseAsync(["apply", "test", "--json"], { from: "user" })
    ).rejects.toMatchObject({ code: "commander.missingMandatoryOptionValue", exitCode: 1 });
  });
});
