import { COMMAND_NAME } from "../../meta";
import { ZodValidationError } from "../../lib/errors/zod";
import { configSchema, type SaleorConfig } from "./schema/schema";

/** Shared schema validation for file and in-memory configuration sources. */
export function parseConfiguration(rawConfig: unknown): SaleorConfig {
  if (rawConfig && typeof rawConfig === "object" && "attributes" in rawConfig) {
    throw new ZodValidationError(
      `The 'attributes' section is no longer supported. ` +
        `Use 'productAttributes' and 'contentAttributes' instead. ` +
        `Run '${COMMAND_NAME} introspect' to migrate your config.`
    );
  }
  const result = configSchema.safeParse(rawConfig);
  if (!result.success) {
    throw ZodValidationError.fromZodError(
      result.error,
      "Configuration file doesn't match the expected schema"
    );
  }
  return result.data;
}
