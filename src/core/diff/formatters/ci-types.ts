import type { DiffResult } from "../types";
import { isBreakingField } from "./constants";

/**
 * Severity level for changes - used for CI decision making
 */
export type ChangeSeverity = "info" | "warning" | "critical";

/**
 * Classifies a diff result by severity for CI decision making
 */
export function classifyChangeSeverity(result: DiffResult): ChangeSeverity {
  // Deletions are always critical
  if (result.operation === "DELETE") {
    return "critical";
  }

  // Updates may be breaking depending on the field
  if (result.operation === "UPDATE" && result.changes) {
    const hasBreaking = result.changes.some((change) => isBreakingField(change.field));
    if (hasBreaking) {
      return "warning";
    }
  }

  // Creates and non-breaking updates are informational
  return "info";
}
