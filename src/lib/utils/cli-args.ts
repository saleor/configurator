import { z } from "zod";

/**
 * Parses command line arguments and validates them using a zod schema
 * @param schema - Zod schema to validate the arguments
 * @returns Validated arguments object
 */
export function parseCliArgs<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.infer<z.ZodObject<T>> {
  // Parse command line arguments manually
  const rawArgs = process.argv.slice(2);
  const parsedArgs: Record<string, string> = {};

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith("--")) {
      // Handle --key=value format
      if (arg.includes("=")) {
        const [key, ...valueParts] = arg.slice(2).split("=");
        const value = valueParts.join("="); // Rejoin in case value contains =
        parsedArgs[key] = value;
      } else {
        // Handle --key value format
        const key = arg.slice(2);
        const value = rawArgs[i + 1];
        if (value && !value.startsWith("--")) {
          parsedArgs[key] = value;
          i++; // Skip the value in next iteration
        }
      }
    }
  }

  return schema.parse(parsedArgs);
}
