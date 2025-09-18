import path from "node:path";
import { isTypeScriptConfigPath } from "./ts-manager";

export function ensureTsConfigPath(configPath: string): string {
  if (isTypeScriptConfigPath(configPath)) {
    return configPath;
  }

  const ext = path.extname(configPath);
  const base = ext.length > 0 ? configPath.slice(0, -ext.length) : configPath;
  return `${base}.ts`;
}
