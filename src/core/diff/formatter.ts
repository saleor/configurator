import { DetailedDiffFormatter, SummaryDiffFormatter } from "./formatters";
import type { DiffSummary } from "./types";

// Formatters for diff operations
const detailedFormatter = new DetailedDiffFormatter();
const summaryFormatter = new SummaryDiffFormatter();

/**
 * Formats a comprehensive diff summary with detailed information
 * @param summary The diff summary to format
 * @returns Formatted string with detailed diff information
 */
export function formatDiff(summary: DiffSummary): string {
  return detailedFormatter.format(summary);
}

/**
 * Formats a brief summary of diff results
 * @param summary The diff summary to format
 * @returns Formatted string with brief summary
 */
export function formatDiffSummary(summary: DiffSummary): string {
  return summaryFormatter.format(summary);
}
