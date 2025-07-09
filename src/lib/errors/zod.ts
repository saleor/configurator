import type { z } from "zod";
import { BaseError, errorFormatHelpers } from "./shared";

export class ZodValidationError extends BaseError {
  constructor(message: string) {
    super(message, "ZOD_VALIDATION_ERROR");
  }

  static fromZodError(message: string, error: z.ZodError): ZodValidationError {
    const formattedErrors = error.errors.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      const errorMessage = formatZodIssue(issue);
      return path === "root" ? errorMessage : `${path}: ${errorMessage}`;
    });

    const fullMessage = errorFormatHelpers.formatGenericErrorMessage(
      message,
      formattedErrors.join("; ")
    );
    return new ZodValidationError(fullMessage);
  }
}

function formatZodIssue(issue: z.ZodIssue): string {
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
    case "invalid_literal":
      return `Must be exactly "${issue.expected}"`;
    case "invalid_union":
      return "Value doesn't match any of the expected types";
    case "invalid_date":
      return "Invalid date format";
    case "not_multiple_of":
      return `Must be a multiple of ${issue.multipleOf}`;
    case "not_finite":
      return "Must be a finite number";
    default:
      return issue.message;
  }
}
