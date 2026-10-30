import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CombinedError } from "@urql/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OraProgressReporter } from "./cli/progress";
import * as deployment from "./core/deployment";
import { StageAggregateError } from "./core/deployment/errors";
import { DiffService } from "./core/diff/service";
import {
  classifyError,
  createEngine,
  type DiffSummary,
  EngineOperationError,
  serialize,
  validate,
} from "./engine";
import { ConfiguratorError, createConfigurator, type SaleorConfig } from "./index";
import { createClient } from "./lib/graphql/client";
import { logger } from "./lib/logger";
import { ConfigurationService } from "./modules/config/config-service";
import { NodeFileSystem } from "./modules/config/yaml-manager";
import { ShopService } from "./modules/shop/shop-service";

vi.mock("./lib/graphql/client", () => ({ createClient: vi.fn() }));

const summary = {
  creates: 0,
  updates: 0,
  deletes: 0,
  totalChanges: 0,
  results: [],
} satisfies DiffSummary;

describe("in-process engine", () => {
  let directory: string;
  let file: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "configurator-engine-"));
    file = join(directory, "config.yml");
    await writeFile(file, "{}\n");
    vi.mocked(createClient).mockReturnValue({} as ReturnType<typeof createClient>);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it("exposes the Configurator API and keeps the prototype compatible", async () => {
    vi.spyOn(ConfigurationService.prototype, "retrieveWithoutSaving").mockResolvedValue({});
    vi.spyOn(DiffService.prototype, "compare").mockResolvedValue(summary);
    const configurator = createConfigurator({
      url: "https://example.test/graphql/",
      token: "secret",
    });
    expect(await configurator.introspect()).toEqual({});
    expect(await configurator.validate(file)).toEqual({});
    expect(configurator.serialize({})).toBe("{}\n");
    expect(await configurator.diff(file)).toEqual(summary);
    expect((await configurator.deploy(file, summary)).exitCode).toBe(0);
    await expect(configurator.validate(join(directory, "missing"))).rejects.toBeInstanceOf(
      ConfiguratorError
    );
    expect(EngineOperationError).toBe(ConfiguratorError);
  });

  it("diffs and deploys an object through real services without configuration file IO", async () => {
    const read = vi
      .spyOn(NodeFileSystem.prototype, "readFile")
      .mockRejectedValue(new Error("Unexpected file read"));
    const write = vi
      .spyOn(NodeFileSystem.prototype, "writeFile")
      .mockRejectedValue(new Error("Unexpected file write"));
    vi.spyOn(ConfigurationService.prototype, "retrieveWithoutSaving").mockResolvedValue({
      shop: { defaultMailSenderName: "Old" },
    });
    const update = vi.spyOn(ShopService.prototype, "updateSettings").mockResolvedValue(null);
    const config = Object.freeze({ shop: Object.freeze({ defaultMailSenderName: "New" }) });
    const configurator = createConfigurator({
      url: "https://example.test/graphql/",
      token: "secret",
    });
    const validated = await configurator.validate(config);
    expect(validated).toEqual(config);
    expect(validated).not.toBe(config);
    const plan = await configurator.diff(config);
    expect(plan.totalChanges).toBe(1);
    const outcome = await configurator.deploy(config, plan);
    expect(outcome.exitCode).toBe(0);
    expect(update).toHaveBeenCalledWith({ defaultMailSenderName: "New" });
    expect(config.shop.defaultMailSenderName).toBe("New");
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("snapshots object input before awaiting remote configuration", async () => {
    const config = { shop: { defaultMailSenderName: "Approved" } };
    vi.spyOn(ConfigurationService.prototype, "retrieveWithoutSaving").mockImplementation(
      async () => {
        config.shop.defaultMailSenderName = "Changed during diff";
        return { shop: { defaultMailSenderName: "Old" } };
      }
    );
    const plan = await createConfigurator({
      url: "https://example.test/graphql/",
      token: "secret",
    }).diff(config);
    expect(plan.results[0].changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "defaultMailSenderName", desiredValue: "Approved" }),
      ])
    );
  });

  it("provides in-memory storage to stages that load configuration themselves", async () => {
    const config = { shop: { defaultMailSenderName: "Approved" } };
    const read = vi.spyOn(NodeFileSystem.prototype, "readFile");
    vi.spyOn(deployment, "getAllStages").mockReturnValue([
      {
        name: "Loads configuration",
        execute: async (context) => {
          config.shop.defaultMailSenderName = "Changed by caller";
          expect(await context.configurator.services.configStorage.load()).toEqual({
            shop: { defaultMailSenderName: "Approved" },
          });
        },
      },
    ]);
    const result = await createConfigurator({
      url: "https://example.test/graphql/",
      token: "secret",
    }).deploy(config, summary);
    expect(result.exitCode).toBe(0);
    expect(read).not.toHaveBeenCalled();
  });

  it.each<SaleorConfig>([
    { channels: "invalid" },
    { attributes: [] },
    {
      channels: [
        { slug: "duplicate", name: "A", currencyCode: "USD", defaultCountry: "US" },
        { slug: "duplicate", name: "B", currencyCode: "USD", defaultCountry: "US" },
      ],
    },
  ])("rejects invalid object input before contacting the store", async (config) => {
    const remote = vi.spyOn(ConfigurationService.prototype, "retrieveWithoutSaving");
    const configurator = createConfigurator({
      url: "https://example.test/graphql/",
      token: "secret",
    });
    await expect(configurator.validate(config)).rejects.toMatchObject({ code: "CONFIG_INVALID" });
    await expect(configurator.diff(config)).rejects.toMatchObject({ code: "CONFIG_INVALID" });
    await expect(configurator.deploy(config, summary)).rejects.toMatchObject({
      code: "CONFIG_INVALID",
    });
    expect(remote).not.toHaveBeenCalled();
  });

  it("imports without output, dotenv, or exiting", async () => {
    await writeFile(join(directory, ".env"), "CONFIGURATOR_IMPORT_SENTINEL=loaded\n");
    const script = `
      for (const name of ['log', 'info', 'warn', 'error', 'debug']) console[name] = () => { throw Error('console output'); };
      process.exit = () => { throw Error('exit'); };
      await import(${JSON.stringify(new URL("./index.ts", import.meta.url).href)});
      if (process.env.CONFIGURATOR_IMPORT_SENTINEL) throw Error('dotenv loaded');
    `;
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        createRequire(import.meta.url).resolve("tsx"),
        "--input-type=module",
        "-e",
        script,
      ],
      {
        cwd: directory,
        env: { ...process.env, LOG_LEVEL: "invalid-host-value" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    expect(output).toBe("");
  });

  it("returns partial deployment failures as data", async () => {
    vi.spyOn(deployment, "getAllStages").mockReturnValue([
      {
        name: "Partial stage",
        execute: async () => {
          throw new StageAggregateError(
            "Stage",
            [{ entity: "failed", error: new Error("rejected") }],
            ["succeeded"]
          );
        },
      },
    ]);
    const spinner = vi.spyOn(OraProgressReporter.prototype, "start");
    const result = await createEngine({
      url: "https://example.test/graphql/",
      token: "secret",
    }).deploy(file, {
      ...summary,
      totalChanges: 1,
      updates: 1,
      results: [{ operation: "UPDATE", entityType: "Shop Settings", entityName: "Shop" }],
    });
    expect(result.exitCode).toBe(5);
    expect(result.result.overallStatus).toBe("partial");
    expect(result.result.stages[0].status).toBe("partial");
    expect(spinner).not.toHaveBeenCalled();
  });

  it("validates and serializes without creating a GraphQL client", async () => {
    vi.mocked(createClient).mockClear();
    const config = await validate(file);
    expect(serialize(config)).toContain("{}");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns typed errors for missing and invalid configuration", async () => {
    await expect(validate(join(directory, "missing.yml"))).rejects.toMatchObject({
      code: "CONFIG_INVALID",
    });
    await writeFile(file, "channels: wrong\n");
    await expect(validate(file)).rejects.toBeInstanceOf(EngineOperationError);
    await expect(validate(file)).rejects.toMatchObject({ code: "CONFIG_INVALID" });
  });

  it("runs preflight validation before contacting a store", async () => {
    await writeFile(
      file,
      serialize({
        channels: [
          { slug: "duplicate", name: "A", currencyCode: "USD", defaultCountry: "US" },
          { slug: "duplicate", name: "B", currencyCode: "USD", defaultCountry: "US" },
        ],
      })
    );
    const compare = vi.spyOn(DiffService.prototype, "compare");
    await expect(
      createEngine({ url: "https://example.test/graphql/", token: "secret" }).diff(file)
    ).rejects.toMatchObject({
      code: "CONFIG_INVALID",
      issues: expect.arrayContaining([expect.objectContaining({ path: expect.any(String) })]),
    });
    expect(compare).not.toHaveBeenCalled();
  });

  it("pulls without saving or emitting logs, without mutating CLI logger settings", async () => {
    const level = logger.settings.minLevel;
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const pull = vi
      .spyOn(ConfigurationService.prototype, "retrieveWithoutSaving")
      .mockImplementation(async () => {
        logger.error("host must not see this");
        await Promise.resolve();
        logger.info("nor this");
        return {};
      });
    const engine = createEngine({ url: "https://example.test/graphql/", token: "secret" });
    expect(await engine.pull()).toEqual({});
    expect(pull).toHaveBeenCalledOnce();
    expect(output).not.toHaveBeenCalled();
    expect(logger.settings.minLevel).toBe(level);
  });

  it("returns diff results and deploys an empty plan silently", async () => {
    vi.spyOn(DiffService.prototype, "compare").mockResolvedValue(summary);
    const engine = createEngine({ url: "https://example.test/graphql/", token: "secret" });
    expect(await engine.diff(file)).toEqual(summary);
    const result = await engine.deploy(file, summary);
    expect(result.exitCode).toBe(0);
    expect(result.result.overallStatus).toBe("success");
  });

  it.each([
    [new StageAggregateError("Stage", [], ["success"]), "DEPLOY_PARTIAL"],
    [new CombinedError({ networkError: new Error("fetch failed") }), "NETWORK_ERROR"],
    [
      new CombinedError({
        graphQLErrors: [{ message: "Access denied", extensions: { code: "FORBIDDEN" } }],
      }),
      "STORE_AUTH_INVALID",
    ],
    [new Error("unexpected failure"), "ENGINE_ERROR"],
  ])("classifies rejected store operations", async (error, code) => {
    vi.spyOn(ConfigurationService.prototype, "retrieveWithoutSaving").mockRejectedValue(error);
    await expect(
      createEngine({ url: "https://example.test/graphql/", token: "secret" }).pull()
    ).rejects.toMatchObject({ code });
    expect(classifyError(error).code).toBe(code);
  });
});
