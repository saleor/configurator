/**
 * Public library entry for programs that run Configurator in-process.
 *
 * Unlike the commands in src/commands, nothing here prints, prompts, reads argv or
 * exits: results and failures are returned, and the host renders them. The legacy
 * CLI keeps its own front door (src/cli/main.ts) and is unaffected.
 */

import { CombinedError } from "@urql/core";
import { stringify, YAMLParseError } from "yaml";
import { SilentProgressReporter } from "./cli/progress";
import type { DeployCommandArgs } from "./commands/deploy";
import type { DeploymentResult, DiffSummary, SaleorConfig } from "./configurator-types";
import { SaleorConfigurator } from "./core/configurator";
import { getAllStages } from "./core/deployment";
import { executeEnhancedDeployment } from "./core/deployment/enhanced-pipeline";
import { EXIT_CODES, toDeploymentError } from "./core/deployment/errors";
import { ProgressIndicator } from "./core/deployment/progress";
import type { DiffSummary as InternalDiffSummary } from "./core/diff";
import {
  ConfigurationLoadError,
  ConfigurationValidationError,
} from "./core/errors/configuration-errors";
import { ServiceComposer } from "./core/service-container";
import { runPreflightValidation } from "./core/validation/preflight";
import { ZodValidationError } from "./lib/errors/zod";
import { createClient } from "./lib/graphql/client";
import { withoutLogging } from "./lib/logger";
import { AttributeCache } from "./modules/attribute/attribute-cache";
import { MemoryConfigurationStorage } from "./modules/config/memory-storage";
import { parseConfiguration } from "./modules/config/parse-configuration";
import type { SaleorConfig as InternalSaleorConfig } from "./modules/config/schema/schema";
import { type ConfigurationStorage, YamlConfigurationManager } from "./modules/config/yaml-manager";

export type { DeploymentResult, DiffSummary, SaleorConfig };
export type {
  DiffChange,
  DiffOperation,
  DiffResult,
  Json,
  StageResult,
} from "./configurator-types";

/** The Saleor minor Configurator is built and tested against. */
export const SUPPORTED_SALEOR = "3.23";

export interface ConfiguratorOptions {
  /** The store's GraphQL endpoint, e.g. https://example.saleor.cloud/graphql/ */
  readonly url: string;
  readonly token: string;
}

export type ConfiguratorErrorCode =
  | "CONFIG_INVALID"
  | "STORE_AUTH_INVALID"
  | "NETWORK_ERROR"
  | "DEPLOY_PARTIAL"
  | "ENGINE_ERROR";

export interface ConfiguratorFailure {
  readonly code: ConfiguratorErrorCode;
  readonly message: string;
  readonly suggestions: readonly string[];
  readonly issues: readonly { path: string; message: string }[];
}

/** An operation failed before it could return a result. */
export class ConfiguratorError extends Error implements ConfiguratorFailure {
  readonly code: ConfiguratorErrorCode;
  readonly suggestions: readonly string[];
  readonly issues: readonly { path: string; message: string }[];

  constructor(error: unknown) {
    const details = classifyError(error);
    super(details.message, { cause: error });
    this.name = "ConfiguratorError";
    this.code = details.code;
    this.suggestions = details.suggestions;
    this.issues = details.issues;
  }
}

function operation<T>(run: () => Promise<T>): Promise<T> {
  return withoutLogging(async () => {
    try {
      return await run();
    } catch (error) {
      throw error instanceof ConfiguratorError ? error : new ConfiguratorError(error);
    }
  });
}

/** A configuration object, or a path to a YAML file. Strings always mean paths. */
export type ConfigurationInput = SaleorConfig | string;

async function loadConfiguration(input: ConfigurationInput): Promise<InternalSaleorConfig> {
  const config =
    typeof input === "string"
      ? await new YamlConfigurationManager(input).load()
      : parseConfiguration(structuredClone(input));
  runPreflightValidation(config, typeof input === "string" ? input : "<memory>");
  return config;
}

/** Checks a configuration object or YAML file without contacting a store. */
export async function validate(input: ConfigurationInput): Promise<SaleorConfig> {
  return operation(async () => (await loadConfiguration(input)) as unknown as SaleorConfig);
}

/** Serializes a configuration exactly as `introspect` writes it. */
export const serialize = (config: SaleorConfig): string => stringify(config);

export function createConfigurator({ url, token }: ConfiguratorOptions) {
  const client = withoutLogging(() => createClient(token, url));
  const configurator = (storage?: ConfigurationStorage) =>
    new SaleorConfigurator(ServiceComposer.compose(client, storage));

  return {
    validate,
    serialize,

    /** Reads the store's configuration. Writes nothing. */
    introspect: (): Promise<SaleorConfig> =>
      operation(
        async () =>
          (await configurator().services.configuration.retrieveWithoutSaving()) as unknown as SaleorConfig
      ),

    /** What deploying this configuration would change in the store. */
    diff: (input: ConfigurationInput): Promise<DiffSummary> =>
      operation(async () => {
        const config = await loadConfiguration(input);
        return (await configurator(
          new MemoryConfigurationStorage(config)
        ).services.diffService.compare()) as unknown as DiffSummary;
      }),

    /**
     * Applies the configuration using the supplied diff. The caller must keep the
     * configuration unchanged between review and deployment. Partial failures are data.
     */
    deploy: async (
      input: ConfigurationInput,
      summary: DiffSummary
    ): Promise<{ result: DeploymentResult; exitCode: number }> => {
      return operation(async () => {
        const config = await loadConfiguration(input);
        const args: DeployCommandArgs = {
          config: typeof input === "string" ? input : "<memory>",
          failOnDelete: false,
          json: true,
          plan: false,
          quiet: true,
          skipMedia: false,
          text: false,
          token,
          url,
          verbose: false,
        };
        const { result, exitCode } = await executeEnhancedDeployment(
          getAllStages(),
          {
            args,
            attributeCache: new AttributeCache(),
            config,
            configurator: configurator(new MemoryConfigurationStorage(config)),
            startTime: new Date(),
            summary: summary as InternalDiffSummary,
          },
          new ProgressIndicator(new SilentProgressReporter())
        );
        return { exitCode, result };
      });
    },
  };
}

export type Configurator = ReturnType<typeof createConfigurator>;

/** Turns anything Configurator threw into a stable code the host can map. */
export function classifyError(error: unknown): ConfiguratorFailure {
  if (error instanceof ConfiguratorError) return error;
  if (error instanceof ConfigurationValidationError) {
    return {
      code: "CONFIG_INVALID",
      issues: error.validationErrors,
      message: error.message,
      suggestions: error.recoverySuggestions ?? [],
    };
  }
  if (
    error instanceof ConfigurationLoadError ||
    error instanceof ZodValidationError ||
    error instanceof YAMLParseError
  ) {
    return {
      code: "CONFIG_INVALID",
      issues: [],
      message: error.message,
      suggestions: error instanceof ConfigurationLoadError ? (error.recoverySuggestions ?? []) : [],
    };
  }
  if (error instanceof CombinedError) {
    const auth = error.graphQLErrors.some((each) =>
      ["FORBIDDEN", "UNAUTHORIZED", "UNAUTHENTICATED", "PERMISSION_DENIED"].includes(
        String(each.extensions?.code)
      )
    );
    if (auth || error.networkError)
      return {
        code: auth ? "STORE_AUTH_INVALID" : "NETWORK_ERROR",
        message: error.message,
        issues: [],
        suggestions: [],
      };
  }
  const deployment = toDeploymentError(error);
  const codes: Partial<Record<number, ConfiguratorErrorCode>> = {
    [EXIT_CODES.AUTHENTICATION]: "STORE_AUTH_INVALID",
    [EXIT_CODES.NETWORK]: "NETWORK_ERROR",
    [EXIT_CODES.VALIDATION]: "CONFIG_INVALID",
    [EXIT_CODES.PARTIAL_FAILURE]: "DEPLOY_PARTIAL",
  };
  return {
    code: codes[deployment.getExitCode()] ?? "ENGINE_ERROR",
    issues: [],
    message: error instanceof Error ? error.message : deployment.message,
    suggestions: deployment.suggestions,
  };
}
