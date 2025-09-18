import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { BuildCommandHandler, type BuildCommandArgs } from "./build";

vi.mock("chokidar", () => {
  const on = vi.fn().mockReturnThis();
  const watch = vi.fn().mockReturnValue({ on });

  return {
    __esModule: true,
    default: { watch },
    watch,
  };
});

vi.mock("../cli/console", () => {
  class MockConsole {
    setOptions = vi.fn();
    status = vi.fn();
    success = vi.fn();
    info = vi.fn();
  }

  return {
    Console: MockConsole,
  };
});

describe("build command", () => {
  async function createTempWorkspace(): Promise<string> {
    return mkdtemp(path.join(tmpdir(), "configurator-build-"));
  }

  it("emits JSON output for a TypeScript configuration", async () => {
    const workspace = await createTempWorkspace();
    const configPath = path.join(workspace, "config.ts");
    const outputPath = path.join(workspace, "config.json");

    const source = `import { defineStack, Channel } from "@saleor/configurator/dsl";

export default defineStack("test", () => {
  new Channel("primary", {
    name: "Primary",
    slug: "primary",
    currencyCode: "USD",
    defaultCountry: "US",
    settings: {
      allocationStrategy: "PRIORITIZE_SORTING_ORDER",
      automaticallyConfirmAllNewOrders: true,
      automaticallyFulfillNonShippableGiftCard: true,
      expireOrdersAfter: 30,
      deleteExpiredOrdersAfter: 60,
      markAsPaidStrategy: "TRANSACTION_FLOW",
      allowUnpaidOrders: false,
      automaticallyCompleteFullyPaidCheckouts: true,
      defaultTransactionFlowStrategy: "AUTHORIZATION",
      includeDraftOrderInVoucherUsage: true,
      useLegacyErrorFlow: false
    }
  });
});
`;

    await writeFile(configPath, source, "utf-8");

    const handler = new BuildCommandHandler();
    const args: BuildCommandArgs = {
      config: configPath,
      out: outputPath,
      pretty: true,
      quiet: true,
      watch: false,
    };

    await handler.execute(args);

    const contents = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(contents);

    expect(parsed.channels).toBeDefined();
    expect(parsed.channels[0].slug).toBe("primary");

    await rm(workspace, { recursive: true, force: true });
  });

  it("infers .ts extension when omitted", async () => {
    const workspace = await createTempWorkspace();
    const configPath = path.join(workspace, "config.ts");

    await writeFile(
      configPath,
      `import { defineStack } from "@saleor/configurator/dsl";
export default defineStack("test", () => {});
`,
      "utf-8"
    );

    const handler = new BuildCommandHandler();
    const args: BuildCommandArgs = {
      config: configPath.replace(/\.ts$/, ""),
      pretty: false,
      quiet: true,
      watch: false,
    };

    await handler.execute(args);

    await rm(workspace, { recursive: true, force: true });
  });
  it("activates watch mode when requested", async () => {
    const workspace = await createTempWorkspace();
    const configPath = path.join(workspace, "config.ts");

    await writeFile(
      configPath,
      `import { defineStack } from "@saleor/configurator/dsl";
export default defineStack("test", () => {});
`,
      "utf-8"
    );

    const handler = new BuildCommandHandler();
    const args: BuildCommandArgs = {
      config: configPath,
      pretty: false,
      quiet: true,
      watch: true,
    };

    await handler.execute(args);

    const chokidarModule = (await import("chokidar")) as unknown as {
      watch: ReturnType<typeof vi.fn>;
    };

    const watchSpy = chokidarModule.watch;
    expect(watchSpy).toHaveBeenCalled();
    const watcherInstance = watchSpy.mock.results.at(-1)?.value as { on: ReturnType<typeof vi.fn> };
    expect(watcherInstance.on).toHaveBeenCalled();

    await rm(workspace, { recursive: true, force: true });
  });
});
