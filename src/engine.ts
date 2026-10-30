/** Compatibility entry for the original Saleor CLI integration. Prefer the package root. */
import { type ConfiguratorOptions, createConfigurator } from "./index";

export type {
  ConfiguratorErrorCode as EngineErrorCode,
  ConfiguratorFailure as EngineError,
  ConfiguratorOptions as EngineOptions,
  DeploymentResult,
  DiffChange,
  DiffOperation,
  DiffResult,
  DiffSummary,
  Json,
  SaleorConfig,
  StageResult,
} from "./index";
export {
  ConfiguratorError as EngineOperationError,
  classifyError,
  SUPPORTED_SALEOR,
  serialize,
  validate,
} from "./index";

export function createEngine(options: ConfiguratorOptions) {
  const configurator = createConfigurator(options);
  return { pull: configurator.introspect, diff: configurator.diff, deploy: configurator.deploy };
}

export type Engine = ReturnType<typeof createEngine>;
