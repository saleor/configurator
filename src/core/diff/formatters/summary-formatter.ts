import type { DiffSummary } from "../types";
import { BaseDiffFormatter } from "./base-formatter";
import { DIFF_ICONS, DIFF_MESSAGES } from "../constants";

/**
 * Formatter for brief diff summaries
 */
export class SummaryDiffFormatter extends BaseDiffFormatter {
  /**
   * Formats a brief summary of diff results
   */
  format(summary: DiffSummary): string {
    this.validateSummary(summary);

    if (summary.totalChanges === 0) {
      return `${DIFF_ICONS.SUMMARY.SUCCESS} ${DIFF_MESSAGES.NO_CHANGES}`;
    }

    const lines: string[] = [];
    this.addMainSummary(lines, summary);
    this.addOperationBreakdown(lines, summary);
    this.addEntityBreakdown(lines, summary);

    return lines.join("\n");
  }

  /**
   * Adds the main summary line
   */
  private addMainSummary(lines: string[], summary: DiffSummary): void {
    lines.push(
      `${DIFF_ICONS.SUMMARY.RESULTS} ${DIFF_MESSAGES.FOUND_DIFFERENCES(summary.totalChanges)}`
    );
  }

  /**
   * Adds breakdown by operation type
   */
  private addOperationBreakdown(lines: string[], summary: DiffSummary): void {
    if (summary.creates > 0) {
      lines.push(
        `${DIFF_ICONS.OPERATIONS.CREATE} ${DIFF_MESSAGES.ITEMS_TO_CREATE(summary.creates)}`
      );
    }

    if (summary.updates > 0) {
      lines.push(
        `${DIFF_ICONS.OPERATIONS.UPDATE} ${DIFF_MESSAGES.ITEMS_TO_UPDATE(summary.updates)}`
      );
    }

    if (summary.deletes > 0) {
      lines.push(
        `${DIFF_ICONS.OPERATIONS.DELETE} ${DIFF_MESSAGES.ITEMS_TO_DELETE(summary.deletes)}`
      );
    }
  }

  /**
   * Adds breakdown by entity type
   */
  private addEntityBreakdown(lines: string[], summary: DiffSummary): void {
    const grouped = this.groupByEntityType(summary.results);

    if (grouped.size === 0) return;

    lines.push("");
    lines.push("By entity type:");

    for (const [entityType, results] of grouped) {
      lines.push(`• ${DIFF_MESSAGES.ENTITY_CHANGES(entityType, results.length)}`);
    }
  }
}
