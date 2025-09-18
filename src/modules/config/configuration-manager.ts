import path from "node:path";
import {
  TypeScriptConfigurationManager,
  isTypeScriptConfigPath,
  type TypeScriptConfigurationOptions,
} from "./ts-manager";
import { YamlConfigurationManager, DEFAULT_CONFIG_PATH } from "./yaml-manager";
import type { ConfigurationStorage } from "./yaml-manager";

export function createConfigurationManager(configPath?: string): ConfigurationStorage {
  const targetPath = configPath ?? DEFAULT_CONFIG_PATH;

  if (isTypeScriptConfigPath(targetPath)) {
    const layoutEnv = process.env.SALEOR_CONFIGURATOR_TS_LAYOUT;
    const layout = layoutEnv === "sections" ? "split-sections" : "single";
    const baseDir =
      layout === "split-sections"
        ? path.join(path.dirname(targetPath), process.env.SALEOR_CONFIGURATOR_TS_BASEDIR ?? "sections")
        : undefined;
    const options: TypeScriptConfigurationOptions =
      layout === "split-sections"
        ? {
            layout,
            baseDir,
          }
        : {
            layout,
          };
    return new TypeScriptConfigurationManager(targetPath, options);
  }

  return new YamlConfigurationManager(targetPath);
}
