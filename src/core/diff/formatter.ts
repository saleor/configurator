import type { DiffSummary } from "./types";
import { DetailedDiffFormatter, SummaryDiffFormatter } from "./formatters";

/**
 * Main diff formatter that provides a unified interface
 * Maintains backward compatibility with the original DiffFormatter
 */
export class DiffFormatter {
  private static readonly detailedFormatter = new DetailedDiffFormatter();
  private static readonly summaryFormatter = new SummaryDiffFormatter();

  /**
   * Formats a comprehensive diff summary with detailed information
   * @param summary The diff summary to format
   * @returns Formatted string with detailed diff information
   */
  static format(summary: DiffSummary): string {
    return DiffFormatter.detailedFormatter.format(summary);
  }

  /**
   * Formats a brief summary of diff results
   * @param summary The diff summary to format
   * @returns Formatted string with brief summary
   */
  static formatSummary(summary: DiffSummary): string {
    return DiffFormatter.summaryFormatter.format(summary);
  }
}
