import chalk from "chalk";
import { DIFF_ICONS, DIFF_MESSAGES, FORMAT_CONFIG } from "../constants";
import type { DiffResult, DiffSummary } from "../types";
import { BaseDiffFormatter } from "./base-formatter";

/**
 * Formatter for detailed diff output with comprehensive information
 */
export class DetailedDiffFormatter extends BaseDiffFormatter {
  /**
   * Formats a complete diff summary with detailed information
   */
  format(summary: DiffSummary): string {
    this.validateSummary(summary);

    if (summary.totalChanges === 0) {
      return `${DIFF_ICONS.SUMMARY.SUCCESS} ${DIFF_MESSAGES.NO_CHANGES}`;
    }

    const lines: string[] = [];
    this.addHeader(lines);
    this.addIntroduction(lines);
    this.addEntitySections(lines, summary);
    this.addSummarySection(lines, summary);

    return lines.join("\n");
  }

  /**
   * Adds the header section to the output
   */
  private addHeader(lines: string[]): void {
    lines.push(chalk.bold.white(`${DIFF_ICONS.SUMMARY.RESULTS} ${DIFF_MESSAGES.HEADER}`));
    lines.push(chalk.gray(this.createSeparator(FORMAT_CONFIG.HEADER_WIDTH)));
    lines.push("");
  }

  /**
   * Adds the introduction text
   */
  private addIntroduction(lines: string[]): void {
    lines.push(DIFF_MESSAGES.RECONCILE_INTRO);
    lines.push("");
  }

  /**
   * Adds sections for each entity type with their changes
   */
  private addEntitySections(lines: string[], summary: DiffSummary): void {
    const grouped = this.groupByEntityType(summary.results);

    for (const [entityType, results] of grouped) {
      this.addEntitySection(lines, entityType, results);
    }
  }

  /**
   * Adds a section for a specific entity type
   */
  private addEntitySection(
    lines: string[],
    entityType: string,
    results: readonly DiffResult[]
  ): void {
    const icon = this.getEntityIcon(entityType as any);
    lines.push(chalk.bold.white(`${icon} ${entityType}`));
    lines.push(
      chalk.gray(this.createSeparator(entityType.length + 2, FORMAT_CONFIG.SUB_SEPARATOR))
    );

    for (const result of results) {
      this.addResultDetails(lines, result);
    }
  }

  /**
   * Adds details for a specific diff result
   */
  private addResultDetails(lines: string[], result: DiffResult): void {
    const opIcon = this.getOperationIcon(result.operation);
    const opText = this.getOperationText(result.operation);
    const opColor = this.getOperationColor(result.operation);

    const entityName = chalk.cyan(`"${result.entityName}"`);
    const operation = opColor(opText);
    const notSupported = opText === "Delete" ? chalk.gray("(not yet supported)") : "";

    lines.push(`  ${opIcon} ${operation}: ${entityName} ${notSupported}`);

    this.addChangeDetails(lines, result);
    this.addOperationSpecificDetails(lines, result);

    lines.push("");
  }

  /**
   * Adds field change details for update operations
   */
  private addChangeDetails(lines: string[], result: DiffResult): void {
    if (!result.changes || result.changes.length === 0) return;

    for (const change of result.changes) {
      const description = change.description || this.formatFieldChange(change);
      lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${description}`);
    }
  }

  /**
   * Formats a field change with proper value handling and colors
   */
  private formatFieldChange(change: any): string {
    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) {
        return chalk.white("(not set)");
      }
      return chalk.white(`"${String(value)}"`);
    };

    const currentValue = formatValue(change.currentValue);
    const desiredValue = formatValue(change.desiredValue);
    
    return `${change.field}: ${currentValue} → ${desiredValue}`;
  }

  /**
   * Adds operation-specific additional details
   */
  private addOperationSpecificDetails(
    lines: string[],
    result: DiffResult
  ): void {
    if (result.operation === "DELETE" && result.current) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${chalk.gray(DIFF_MESSAGES.DELETE_EXPLANATION(
          result.entityType
        ))}`
      );
    }

    if (result.operation === "CREATE" && result.desired) {
      this.addCreationDetails(lines, result.desired);
    }
  }

  /**
   * Adds specific details for entity creation
   */
  private addCreationDetails(lines: string[], entity: unknown): void {
    const typedEntity = entity as any;

    if (typedEntity?.currencyCode) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} Currency: ${chalk.cyan(typedEntity.currencyCode)}`
      );
    }

    if (typedEntity?.defaultCountry) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} Country: ${chalk.cyan(typedEntity.defaultCountry)}`
      );
    }
  }

  /**
   * Adds the summary statistics section
   */
  private addSummarySection(lines: string[], summary: DiffSummary): void {
    lines.push(chalk.bold.white(`${DIFF_ICONS.SUMMARY.CHART} ${DIFF_MESSAGES.SUMMARY_HEADER}`));
    lines.push(
      chalk.gray(this.createSeparator(
        FORMAT_CONFIG.SUMMARY_WIDTH,
        FORMAT_CONFIG.SUB_SEPARATOR
      ))
    );
    lines.push(DIFF_MESSAGES.TOTAL_CHANGES(summary.totalChanges));
    lines.push(
      `• ${chalk.green(summary.creates.toString())} ${this.formatPlural(summary.creates, "Creation")}`
    );
    lines.push(`• ${chalk.yellow(summary.updates.toString())} ${this.formatPlural(summary.updates, "Update")}`);
    lines.push(
      `• ${chalk.red(summary.deletes.toString())} ${this.formatPlural(summary.deletes, "Deletion")}`
    );
  }
}
