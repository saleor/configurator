import chalk from "chalk";
import type { z } from "zod";

export interface ZodErrorFormatOptions {
  showPath?: boolean;
  showCode?: boolean;
  colorize?: boolean;
  groupByPath?: boolean;
  showSuggestions?: boolean;
}

export interface FormattedZodError {
  message: string;
  suggestions?: string[];
  details: Array<{
    path: string;
    message: string;
    code: string;
    received?: unknown;
    expected?: string;
  }>;
}

const ERROR_SUGGESTIONS = new Map<string, string[]>([
  [
    "invalid_type",
    [
      "Check the data type of the provided value",
      "Ensure the value matches the expected type",
    ],
  ],
  [
    "too_small",
    [
      "Increase the value to meet the minimum requirement",
      "Check if the value meets the minimum length/size",
    ],
  ],
  [
    "too_big",
    [
      "Reduce the value to meet the maximum requirement",
      "Check if the value exceeds the maximum length/size",
    ],
  ],
  [
    "invalid_string",
    [
      "Check the string format",
      "Ensure the string matches the expected pattern",
    ],
  ],
  [
    "invalid_url",
    [
      "Provide a valid URL format (e.g., https://example.com)",
      "Check if the URL is properly formatted",
    ],
  ],
  [
    "invalid_email",
    [
      "Provide a valid email address",
      "Check the email format (e.g., user@domain.com)",
    ],
  ],
  [
    "custom",
    [
      "Review the custom validation requirements",
      "Check the specific validation rules",
    ],
  ],
]);

const FIELD_SUGGESTIONS = new Map<string, string[]>([
  [
    "url",
    [
      "Use format: https://your-store.saleor.cloud/graphql/",
      "Ensure the URL is accessible and valid",
    ],
  ],
  [
    "token",
    [
      "Provide a valid Saleor API token",
      "Check if the token has the required permissions",
    ],
  ],
  [
    "config",
    [
      "Ensure the configuration file path is correct",
      "Check if the file exists and is readable",
    ],
  ],
]);

function enhanceErrorMessage(issue: z.ZodIssue): string {
  switch (issue.code) {
    case "invalid_type":
      return `Expected ${issue.expected}, but received ${issue.received}`;

    case "too_small":
      if (issue.type === "string") {
        return `Must be at least ${issue.minimum} character${
          issue.minimum === 1 ? "" : "s"
        } long`;
      }
      if (issue.type === "number") {
        return `Must be at least ${issue.minimum}`;
      }
      if (issue.type === "array") {
        return `Must contain at least ${issue.minimum} item${
          issue.minimum === 1 ? "" : "s"
        }`;
      }
      return issue.message;

    case "too_big":
      if (issue.type === "string") {
        return `Must be at most ${issue.maximum} character${
          issue.maximum === 1 ? "" : "s"
        } long`;
      }
      if (issue.type === "number") {
        return `Must be at most ${issue.maximum}`;
      }
      if (issue.type === "array") {
        return `Must contain at most ${issue.maximum} item${
          issue.maximum === 1 ? "" : "s"
        }`;
      }
      return issue.message;

    case "invalid_string":
      if (issue.validation === "email") {
        return "Must be a valid email address";
      }
      if (issue.validation === "url") {
        return "Must be a valid URL";
      }
      if (issue.validation === "uuid") {
        return "Must be a valid UUID";
      }
      return issue.message;

    case "invalid_enum_value":
      return `Must be one of: ${issue.options.join(", ")}`;

    case "unrecognized_keys":
      return `Unrecognized key${
        issue.keys.length === 1 ? "" : "s"
      }: ${issue.keys.join(", ")}`;

    case "invalid_arguments":
      return "Invalid function arguments";

    case "invalid_return_type":
      return "Invalid return type";

    case "invalid_date":
      return "Invalid date format";

    case "invalid_literal":
      return `Must be exactly "${issue.expected}"`;

    case "invalid_union":
      return "Value doesn't match any of the expected types";

    case "invalid_union_discriminator":
      return "Invalid discriminator value";

    case "invalid_intersection_types":
      return "Value doesn't satisfy all required types";

    case "not_multiple_of":
      return `Must be a multiple of ${issue.multipleOf}`;

    case "not_finite":
      return "Must be a finite number";

    default:
      return issue.message;
  }
}

function getExpectedValue(issue: z.ZodIssue): string | undefined {
  switch (issue.code) {
    case "invalid_type":
      return issue.expected;
    case "invalid_literal":
      return String(issue.expected);
    case "invalid_enum_value":
      return issue.options.join(" | ");
    case "too_small":
      return `>= ${issue.minimum}`;
    case "too_big":
      return `<= ${issue.maximum}`;
    default:
      return undefined;
  }
}

function generateSuggestions(errors: z.ZodIssue[]): string[] {
  const suggestions = new Set<string>();

  errors.forEach((issue) => {
    // Add code-specific suggestions
    const codeSuggestions = ERROR_SUGGESTIONS.get(issue.code);
    if (codeSuggestions) {
      codeSuggestions.forEach((suggestion) => suggestions.add(suggestion));
    }

    // Add field-specific suggestions
    const fieldPath = issue.path[0] as string;
    if (fieldPath) {
      const fieldSuggestions = FIELD_SUGGESTIONS.get(fieldPath);
      if (fieldSuggestions) {
        fieldSuggestions.forEach((suggestion) => suggestions.add(suggestion));
      }
    }

    // Add context-specific suggestions
    if (
      issue.code === "invalid_type" &&
      ["url", "token"].includes(fieldPath)
    ) {
      suggestions.add("Run without arguments for interactive mode");
    }
  });

  return Array.from(suggestions);
}

function groupErrorsByPath(
  details: FormattedZodError["details"]
): FormattedZodError["details"] {
  const grouped = new Map<string, FormattedZodError["details"][0][]>();

  details.forEach((detail) => {
    const path = detail.path;
    if (!grouped.has(path)) {
      grouped.set(path, []);
    }
    grouped.get(path)!.push(detail);
  });

  // Flatten back to array, keeping the grouping structure
  const result: FormattedZodError["details"] = [];
  grouped.forEach((errors, path) => {
    if (errors.length === 1) {
      result.push(errors[0]);
    } else {
      // Combine multiple errors for the same path
      result.push({
        path,
        message: errors.map((e) => e.message).join("; "),
        code: errors[0].code,
        received: errors[0].received,
        expected: errors
          .map((e) => e.expected)
          .filter(Boolean)
          .join(" | "),
      });
    }
  });

  return result;
}

function buildErrorMessage(
  details: FormattedZodError["details"],
  options: { showPath: boolean; showCode: boolean; colorize: boolean }
): string {
  const { showPath, showCode, colorize } = options;

  return details
    .map((detail) => {
      const parts: string[] = [];

      if (showPath && detail.path !== "root") {
        const pathStr = colorize ? chalk.cyan(detail.path) : detail.path;
        parts.push(`${pathStr}:`);
      }

      parts.push(detail.message);

      if (showCode) {
        const codeStr = colorize
          ? chalk.gray(`[${detail.code}]`)
          : `[${detail.code}]`;
        parts.push(codeStr);
      }

      if (detail.received !== undefined) {
        const receivedStr = colorize
          ? chalk.red(`(received: ${JSON.stringify(detail.received)})`)
          : `(received: ${JSON.stringify(detail.received)})`;
        parts.push(receivedStr);
      }

      const prefix = colorize ? chalk.red("  • ") : "  • ";
      return prefix + parts.join(" ");
    })
    .join("\n");
}

export function formatZodError(
  error: z.ZodError,
  options: ZodErrorFormatOptions = {}
): FormattedZodError {
  const {
    showPath = true,
    showCode = false,
    colorize = true,
    groupByPath = false,
    showSuggestions = true,
  } = options;

  const details = error.errors.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: enhanceErrorMessage(issue),
    code: issue.code,
    received: "received" in issue ? issue.received : undefined,
    expected: getExpectedValue(issue),
  }));

  const suggestions = showSuggestions
    ? generateSuggestions(error.errors)
    : undefined;

  // Group errors by path if requested
  const processedDetails = groupByPath
    ? groupErrorsByPath(details)
    : details;

  const message = buildErrorMessage(processedDetails, {
    showPath,
    showCode,
    colorize,
  });

  return {
    message,
    suggestions,
    details: processedDetails,
  };
}

export function formatZodErrorForCLI(
  error: z.ZodError,
  options: ZodErrorFormatOptions = {}
): string {
  const formatted = formatZodError(error, {
    colorize: true,
    showSuggestions: true,
    ...options,
  });

  const parts: string[] = [];

  // Main error message
  parts.push(chalk.red("❌ Validation Error:"));
  parts.push(formatted.message);

  // Suggestions
  if (formatted.suggestions?.length) {
    parts.push("");
    parts.push(chalk.yellow("💡 Suggestions:"));
    formatted.suggestions.forEach((suggestion) => {
      parts.push(chalk.dim(`  • ${suggestion}`));
    });
  }

  return parts.join("\n");
}
