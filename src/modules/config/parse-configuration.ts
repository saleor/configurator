import { ZodValidationError } from "../../lib/errors/zod";
import { logger } from "../../lib/logger";
import { COMMAND_NAME } from "../../meta";
import { checkConfiguration, summarizeUnknownKeys } from "./check-configuration";
import type { SaleorConfig } from "./schema/schema";

/** Shared schema validation for file and in-memory configuration sources. */
export function parseConfiguration(rawConfig: unknown): SaleorConfig {
  if (rawConfig && typeof rawConfig === "object" && "attributes" in rawConfig) {
    throw new ZodValidationError(
      `The 'attributes' section is no longer supported. ` +
        `Use 'productAttributes' and 'contentAttributes' instead. ` +
        `Run '${COMMAND_NAME} introspect' to migrate your config.`
    );
  }
  const result = checkConfiguration(rawConfig);
  if (!result.success) {
    throw ZodValidationError.fromZodError(
      result.error,
      "Configuration file doesn't match the expected schema"
    );
  }
  for (const warning of summarizeUnknownKeys(result.unknownKeys)) {
    logger.warn(warning.message);
  }
  return result.data;
}
