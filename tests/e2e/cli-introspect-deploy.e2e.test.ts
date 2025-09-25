import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "yaml";

import { createCliRunner, type CliResult } from "../../src/test-helpers/cli-runner";

const saleorUrl =
  process.env.CONFIGURATOR_E2E_SALEOR_URL ??
  process.env.SALEOR_E2E_URL ??
  process.env.SALEOR_URL ??
  "https://sandbox-a.staging.saleor.cloud/graphql/";

const saleorToken =
  process.env.CONFIGURATOR_E2E_SALEOR_TOKEN ??
  process.env.SALEOR_E2E_TOKEN ??
  process.env.SALEOR_TOKEN;

const runE2ETests = saleorToken ? describe.sequential : describe.skip;

function expectSuccessful(result: CliResult, step: string) {
  expect(result.timedOut).toBe(false);
  expect(result.exitCode, `CLI exited with ${result.exitCode} during ${step}: ${result.cleanStderr}`).toBe(0);
}

function resolveTimeout(): number | undefined {
  if (!process.env.CONFIGURATOR_E2E_TIMEOUT) return undefined;
  const parsed = Number.parseInt(process.env.CONFIGURATOR_E2E_TIMEOUT, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

runE2ETests("Saleor Configurator CLI end-to-end", () => {
  const runner = createCliRunner({ timeout: 420_000 });
  let workspaceRoot: string;

  const createScenario = async (label: string) => {
    const base = await mkdtemp(join(workspaceRoot, `${label}-`));
    const configPath = join(base, "config.yml");
    const reportsDir = join(base, "reports");
    await mkdir(reportsDir, { recursive: true });
    return {
      base,
      configPath,
      reportsDir,
      mutatedReportPath: join(reportsDir, "deploy-change.json"),
      restoreReportPath: join(reportsDir, "deploy-restore.json"),
    };
  };

  const buildArgs = (command: string, configPath: string, ...extra: string[]) => [
    command,
    "--url",
    saleorUrl,
    "--token",
    saleorToken || "",
    "--config",
    configPath,
    ...extra,
  ];

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), "saleor-configurator-e2e-"));
  });

  afterAll(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  test("introspect → diff → deploy → re-introspect → restore baseline", async () => {
    const {
      base,
      configPath,
      mutatedReportPath,
      restoreReportPath,
    } = await createScenario("happy-path");
    const commandTimeout = resolveTimeout();

    const baselineCopy = join(base, "config.baseline.yml");
    const mutatedCopy = join(base, "config.mutated.yml");
    const deployedSnapshot = join(base, "config.deployed.yml");
    const restoredSnapshot = join(base, "config.restored.yml");

    const initialIntrospect = await runner.run(
      buildArgs("introspect", configPath, "--quiet"),
      { timeout: commandTimeout }
    );
    expectSuccessful(initialIntrospect, "initial introspection");

    const baselineContent = await readFile(configPath, "utf-8");
    await writeFile(baselineCopy, baselineContent, "utf-8");

    const baselineConfig = yaml.parse(baselineContent) as Record<string, any>;
    expect(Array.isArray(baselineConfig.channels) && baselineConfig.channels.length > 0).toBe(true);

    const mutatedConfig = structuredClone(baselineConfig);

    const originalMailName: string | null = baselineConfig?.shop?.defaultMailSenderName ?? null;
    const originalMailAddress: string | null = baselineConfig?.shop?.defaultMailSenderAddress ?? null;
    const originalCheckoutLimit: number | null = baselineConfig?.shop?.limitQuantityPerCheckout ?? null;
    const originalAllowUnpaid = Boolean(baselineConfig.channels?.[0]?.settings?.allowUnpaidOrders);

    const nextMailName = `Configurator QA ${new Date().toISOString()}`;
    const nextMailAddress = "qa@saleor-configurator.dev";
    const nextCheckoutLimit = typeof originalCheckoutLimit === "number"
      ? Math.max(1, originalCheckoutLimit + 1)
      : 25;

    mutatedConfig.shop = {
      ...mutatedConfig.shop,
      defaultMailSenderName: nextMailName,
      defaultMailSenderAddress: nextMailAddress,
      limitQuantityPerCheckout: nextCheckoutLimit,
    };

    const targetChannel = mutatedConfig.channels?.[0];
    if (targetChannel) {
      targetChannel.settings = {
        ...targetChannel.settings,
        allowUnpaidOrders: !originalAllowUnpaid,
      };
    }

    const mutatedYaml = yaml.stringify(mutatedConfig);
    await writeFile(configPath, mutatedYaml, "utf-8");
    await writeFile(mutatedCopy, mutatedYaml, "utf-8");

    const diffResult = await runner.run(buildArgs("diff", configPath), { timeout: commandTimeout });
    expectSuccessful(diffResult, "diff before deploy");
    expect(diffResult.cleanStdout).toMatch(/Found \d+ differences?/);

    const deployResult = await runner.run(
      buildArgs("deploy", configPath, "--ci", "--quiet", "--reportPath", mutatedReportPath),
      { timeout: commandTimeout }
    );
    expectSuccessful(deployResult, "deployment");

    const diffAfterDeploy = await runner.run(buildArgs("diff", configPath), { timeout: commandTimeout });
    expectSuccessful(diffAfterDeploy, "post-deploy diff");
    expect(diffAfterDeploy.cleanStdout).toContain("No differences found");

    await rename(configPath, deployedSnapshot);

    const verifyIntrospect = await runner.run(
      buildArgs("introspect", configPath, "--quiet"),
      { timeout: commandTimeout }
    );
    expectSuccessful(verifyIntrospect, "verification introspection");

    const deployedContent = await readFile(configPath, "utf-8");
    const deployedConfig = yaml.parse(deployedContent) as Record<string, any>;
    expect(deployedConfig.shop.defaultMailSenderName).toBe(nextMailName);
    expect(deployedConfig.shop.defaultMailSenderAddress).toBe(nextMailAddress);
    expect(deployedConfig.shop.limitQuantityPerCheckout).toBe(nextCheckoutLimit);
    expect(deployedConfig.channels?.[0]?.settings?.allowUnpaidOrders).toBe(!originalAllowUnpaid);

    await rename(configPath, join(base, "config.remote-after-change.yml"));
    await writeFile(configPath, baselineContent, "utf-8");

    const redeployResult = await runner.run(
      buildArgs(
        "deploy",
        configPath,
        "--ci",
        "--quiet",
        "--reportPath",
        restoreReportPath
      ),
      { timeout: commandTimeout }
    );
    expectSuccessful(redeployResult, "baseline redeploy");

    await rename(configPath, restoredSnapshot);

    const finalIntrospect = await runner.run(
      buildArgs("introspect", configPath, "--quiet"),
      { timeout: commandTimeout }
    );
    expectSuccessful(finalIntrospect, "final introspection");

    const restoredContent = await readFile(configPath, "utf-8");
    const restoredConfig = yaml.parse(restoredContent) as Record<string, any>;
    expect(restoredConfig.shop.defaultMailSenderName ?? null).toBe(originalMailName);
    expect(restoredConfig.shop.defaultMailSenderAddress ?? null).toBe(originalMailAddress);
    expect(restoredConfig.shop.limitQuantityPerCheckout ?? null).toBe(originalCheckoutLimit);
    expect(restoredConfig.channels?.[0]?.settings?.allowUnpaidOrders).toBe(originalAllowUnpaid);

    const diffAfterRestore = await runner.run(buildArgs("diff", configPath), {
      timeout: commandTimeout,
    });
    expectSuccessful(diffAfterRestore, "post-restore diff");
    expect(diffAfterRestore.cleanStdout).toContain("No differences found");
  });

  test("introspect fails with invalid credentials", async () => {
    const { configPath } = await createScenario("invalid-token");
    const result = await runner.run(
      [
        "introspect",
        "--url",
        saleorUrl,
        "--token",
        "invalid-token",
        "--config",
        configPath,
        "--quiet",
      ],
      { timeout: resolveTimeout() }
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.cleanStderr).toMatch(/(Permission|token|Unauthorized)/i);
  });

  test("introspect supports selective include and exclude flows", async () => {
    const { base, configPath } = await createScenario("selective-introspect");
    const includeResult = await runner.run(
      buildArgs("introspect", configPath, "--quiet", "--include", "shop,channels"),
      { timeout: resolveTimeout() }
    );
    expectSuccessful(includeResult, "selective include introspection");

    const includeConfig = yaml.parse(await readFile(configPath, "utf-8")) as Record<string, any>;
    expect(includeConfig.shop).toBeDefined();
    expect(includeConfig.channels).toBeDefined();
    expect(includeConfig.warehouses).toBeUndefined();
    expect(includeConfig.products).toBeUndefined();

    const excludePath = join(base, "config.exclude.yml");
    const excludeResult = await runner.run(
      buildArgs("introspect", excludePath, "--quiet", "--exclude", "shop,channels"),
      { timeout: resolveTimeout() }
    );
    expectSuccessful(excludeResult, "selective exclude introspection");

    const excludeConfig = yaml.parse(await readFile(excludePath, "utf-8")) as Record<string, any>;
    expect(excludeConfig.shop).toBeUndefined();
    expect(excludeConfig.channels).toBeUndefined();
    expect(Object.keys(excludeConfig).length).toBeGreaterThan(0);
  });

  test("introspect creates backups when overwriting existing config", async () => {
    const { base, configPath } = await createScenario("backups");

    const firstRun = await runner.run(
      buildArgs("introspect", configPath, "--quiet"),
      { timeout: resolveTimeout() }
    );
    expectSuccessful(firstRun, "initial introspection for backup test");

    const mutatedConfig = yaml.parse(await readFile(configPath, "utf-8")) as Record<string, any>;
    if (mutatedConfig.shop) {
      mutatedConfig.shop.defaultMailSenderName = "Backup Test";
    }
    await writeFile(configPath, yaml.stringify(mutatedConfig), "utf-8");

    const overwriteResult = await runner.run(
      buildArgs("introspect", configPath, "--quiet"),
      {
        timeout: resolveTimeout(),
        env: {
          CONFIGURATOR_AUTO_CONFIRM: "true",
        },
      }
    );
    expectSuccessful(overwriteResult, "introspection with auto confirm");

    const directoryContents = await readdir(base);
    const backupFiles = directoryContents.filter((name) =>
      name.startsWith("config.backup.") && name.endsWith(".yml")
    );
    expect(backupFiles.length).toBeGreaterThanOrEqual(1);
  });

  test("deploy surfaces validation errors for malformed configuration", async () => {
    const { configPath } = await createScenario("deploy-validation");

    const initial = await runner.run(
      buildArgs("introspect", configPath, "--quiet"),
      { timeout: resolveTimeout() }
    );
    expectSuccessful(initial, "seed configuration for validation test");

    const invalidConfig = yaml.parse(await readFile(configPath, "utf-8")) as Record<string, any>;
    if (Array.isArray(invalidConfig.channels) && invalidConfig.channels[0]) {
      invalidConfig.channels[0].slug = undefined;
    }
    await writeFile(configPath, yaml.stringify(invalidConfig), "utf-8");

    const deployResult = await runner.run(
      buildArgs("deploy", configPath, "--ci", "--quiet"),
      { timeout: resolveTimeout() }
    );

    expect(deployResult.success).toBe(false);
    expect(deployResult.exitCode).toBe(4);
    const combinedOutput = `${deployResult.cleanStdout}\n${deployResult.cleanStderr}`;
    expect(combinedOutput).toMatch(/validation/i);
    expect(combinedOutput).toMatch(/duplicate|slug|missing/i);
  });
});

if (!saleorToken) {
  console.warn(
    "Skipping Saleor CLI end-to-end tests. Provide CONFIGURATOR_E2E_SALEOR_TOKEN to enable them."
  );
}
