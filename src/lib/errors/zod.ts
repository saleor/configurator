import type { z } from "zod";
import { BaseError, errorFormatHelpers } from "./shared";

export class ZodValidationError extends BaseError {
  constructor(message: string) {
    super(message, "ZOD_VALIDATION_ERROR");
  }

  static fromZodError(error: z.ZodError, message?: string): ZodValidationError {
    const formattedErrors = error.issues.map((issue) => {
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
  // For Zod v4, let's use the default message but improve some specific cases
  const message = issue.message;

  // Customize common error patterns for better UX
  if (message.includes("Invalid email")) {
    return "Must be a valid email address";
  }
  if (message.includes("Invalid url")) {
    return "Must be a valid URL";
  }
  if (message.includes("Invalid uuid")) {
    return "Must be a valid UUID";
  }
  if (message.includes("Too small") && message.includes("string")) {
    const match = message.match(/>=(\d+)/);
    if (match) {
      const min = parseInt(match[1]);
      return `Must be at least ${min} character${min === 1 ? "" : "s"} long`;
    }
  }
  if (message.includes("Too small") && message.includes("number")) {
    const match = message.match(/>=(\d+)/);
    if (match) {
      return `Must be at least ${match[1]}`;
    }
  }
  if (message.includes("Too small") && message.includes("array")) {
    const match = message.match(/>=(\d+)/);
    if (match) {
      const min = parseInt(match[1]);
      return `Must contain at least ${min} item${min === 1 ? "" : "s"}`;
    }
  }
  if (message.includes("Invalid option")) {
    const match = message.match(/expected one of (.+)/);
    if (match) {
      // Clean up the quoted options format: "admin"|"user"|"guest" -> admin, user, guest
      const options = match[1].replace(/"/g, "").replace(/\|/g, ", ");
      return `Must be one of: ${options}`;
    }
  }
  if (
    message.includes("Invalid input") &&
    message.includes("expected") &&
    !message.includes("received")
  ) {
    const match = message.match(/expected (.+)/);
    if (match) {
      return `Must be exactly ${match[1]}`;
    }
  }
  if (
    message.includes("Invalid input") &&
    message.includes("expected") &&
    message.includes("received")
  ) {
    const typeMatch = message.match(/expected (.+?), received (.+)/);
    if (typeMatch) {
      return `Expected ${typeMatch[1]}, but received ${typeMatch[2]}`;
    }
  }
  if (message === "Invalid input") {
    return "Value doesn't match any of the expected types";
  }

  return message;
}
