import type { z } from "zod";
import { configSchema, type SaleorConfig } from "./schema/schema";

/** A key the schema doesn't define. Parsing drops it from the configuration. */
export interface UnknownConfigKey {
  path: string;
  key: string;
}

export type ConfigurationCheck =
  | { success: true; data: SaleorConfig; unknownKeys: UnknownConfigKey[] }
  | { success: false; error: z.ZodError };

/**
 * Validates a raw configuration against the schema and lists the keys parsing
 * dropped because the schema doesn't define them. Unknown keys don't fail the
 * check, so callers decide how to surface them.
 */
export function checkConfiguration(rawConfig: unknown): ConfigurationCheck {
  const result = configSchema.safeParse(rawConfig);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return {
    success: true,
    data: result.data,
    unknownKeys: collectDroppedKeys(rawConfig, result.data, []),
  };
}

export interface UnknownKeyWarning {
  /** Exact location for a single occurrence, e.g. `products.3.foo`; a pattern such as `products[].foo` when repeated. */
  location: string;
  occurrences: number;
  message: string;
}

/** Groups repeated unknown keys (the same key on many entries) into one warning each. */
export function summarizeUnknownKeys(
  unknownKeys: readonly UnknownConfigKey[]
): UnknownKeyWarning[] {
  const groups = new Map<string, string[]>();
  for (const { path, key } of unknownKeys) {
    const location = path ? `${path}.${key}` : key;
    const pattern = location.replace(/\.\d+(?=\.|$)/g, "[]");
    const locations = groups.get(pattern) ?? [];
    locations.push(location);
    groups.set(pattern, locations);
  }
  return [...groups].map(([pattern, locations]) => {
    const location = locations.length === 1 ? locations[0]! : pattern;
    const repeated = locations.length > 1 ? ` (${locations.length} occurrences)` : "";
    return {
      location,
      occurrences: locations.length,
      message: `Unknown key "${location}" is not supported and was ignored${repeated}`,
    };
  });
}

function collectDroppedKeys(
  raw: unknown,
  parsed: unknown,
  path: readonly (string | number)[]
): UnknownConfigKey[] {
  if (Array.isArray(raw) && Array.isArray(parsed)) {
    return raw.flatMap((item, index) => collectDroppedKeys(item, parsed[index], [...path, index]));
  }
  if (!isPlainObject(raw) || !isPlainObject(parsed)) {
    return [];
  }
  return Object.entries(raw).flatMap(([key, value]) =>
    key in parsed
      ? collectDroppedKeys(value, parsed[key], [...path, key])
      : [{ path: path.join("."), key }]
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
