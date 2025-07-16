import chalk from "chalk";
import { DIFF_ICONS, DIFF_MESSAGES, FORMAT_CONFIG } from "../constants";
import type { DiffResult, DiffSummary, EntityType, DiffChange } from "../types";
import { BaseDiffFormatter } from "./base-formatter";

/**
 * Formatter for deploy command with enhanced change visualization
 */
export class DeployDiffFormatter extends BaseDiffFormatter {
  constructor(private compactArrays: boolean = true) {
    super();
  }

  /**
   * Formats a diff summary optimized for deployment preview
   */
  format(summary: DiffSummary): string {
    this.validateSummary(summary);

    if (summary.totalChanges === 0) {
      return `${DIFF_ICONS.SUMMARY.SUCCESS} ${DIFF_MESSAGES.NO_CHANGES}`;
    }

    const lines: string[] = [];
    this.addHeader(lines);
    this.addEntitySections(lines, summary);
    this.addSummarySection(lines, summary);

    return lines.join("\n");
  }

  private addHeader(lines: string[]): void {
    lines.push(chalk.bold.white("📋 Configuration Changes"));
    lines.push(chalk.gray(this.createSeparator(FORMAT_CONFIG.HEADER_WIDTH)));
    lines.push("");
  }

  private addEntitySections(lines: string[], summary: DiffSummary): void {
    const grouped = this.groupByEntityType(summary.results);

    for (const [entityType, results] of grouped) {
      this.addEntitySection(lines, entityType, results);
    }
  }

  private addEntitySection(
    lines: string[],
    entityType: EntityType,
    results: readonly DiffResult[]
  ): void {
    const icon = this.getEntityIcon(entityType as any);
    lines.push(chalk.bold.white(`${icon} ${entityType}`));
    lines.push(chalk.gray(this.createSeparator(entityType.length + 2, FORMAT_CONFIG.SUB_SEPARATOR)));

    for (const result of results) {
      this.addResultDetails(lines, result);
    }
  }

  private addResultDetails(lines: string[], result: DiffResult): void {
    const opIcon = this.getOperationIcon(result.operation);
    const opText = this.getOperationText(result.operation);
    const opColor = this.getOperationColor(result.operation);

    const entityName = chalk.cyan(`"${result.entityName}"`);
    const operation = opColor(opText);

    lines.push(`  ${opIcon} ${operation}: ${entityName}`);

    // Add detailed changes for updates
    if (result.operation === "UPDATE" && result.changes && result.changes.length > 0) {
      if (this.compactArrays) {
        // Group changes by field for array values
        const groupedChanges = this.groupArrayChanges(result.changes);
        
        for (const change of groupedChanges) {
          const changeDescription = this.formatFieldChange(change);
          lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${changeDescription}`);
        }
      } else {
        // Show individual changes (original format)
        for (const change of result.changes) {
          const changeDescription = this.formatFieldChange(change);
          lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${changeDescription}`);
        }
      }
    }

    // Add creation details
    if (result.operation === "CREATE" && result.desired) {
      this.addCreationDetails(lines, result.desired);
    }

    // Add deletion warning
    if (result.operation === "DELETE") {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${chalk.red("⚠️  This will be permanently deleted")}`
      );
    }

    lines.push("");
  }

  private groupArrayChanges(changes: readonly DiffChange[]): any[] {
    // Group changes by field name
    const fieldGroups = new Map<string, any[]>();
    const nonArrayChanges: any[] = [];
    
    for (const change of changes) {
      // Check if this is an array value change (ends with .values)
      if (change.field.endsWith('.values')) {
        const existingChanges = fieldGroups.get(change.field) || [];
        existingChanges.push(change);
        fieldGroups.set(change.field, existingChanges);
      } else {
        nonArrayChanges.push(change);
      }
    }
    
    // Convert grouped array changes into single entries
    const consolidatedChanges: any[] = [...nonArrayChanges];
    
    for (const [field, fieldChanges] of fieldGroups) {
      const added: string[] = [];
      const removed: string[] = [];
      
      for (const change of fieldChanges) {
        if (change.currentValue === null && change.desiredValue !== null) {
          added.push(String(change.desiredValue));
        } else if (change.currentValue !== null && change.desiredValue === null) {
          removed.push(String(change.currentValue));
        }
      }
      
      // Create a consolidated change entry
      if (added.length > 0 || removed.length > 0) {
        consolidatedChanges.push({
          field,
          currentValue: removed.length > 0 ? removed : null,
          desiredValue: added.length > 0 ? added : null,
          isArrayChange: true,
          added,
          removed
        });
      }
    }
    
    return consolidatedChanges;
  }

  private formatFieldChange(change: any): string {
    // Handle array changes specially
    if (change.isArrayChange) {
      return this.formatArrayChange(change);
    }

    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) {
        return chalk.gray("(not set)");
      }
      if (typeof value === "boolean") {
        return value ? chalk.green("true") : chalk.red("false");
      }
      if (typeof value === "number") {
        return chalk.cyan(String(value));
      }
      return chalk.white(`"${String(value)}"`);
    };

    const field = chalk.yellow(change.field);
    const oldValue = formatValue(change.currentValue);
    const newValue = formatValue(change.desiredValue);
    
    return `${field}: ${oldValue} ${chalk.gray("→")} ${newValue}`;
  }

  private formatArrayChange(change: any): string {
    const field = chalk.yellow(change.field);
    const parts: string[] = [];
    
    if (change.removed.length > 0) {
      const removedStr = change.removed.map((v: string) => chalk.red(`-${v}`)).join(", ");
      parts.push(removedStr);
    }
    
    if (change.added.length > 0) {
      const addedStr = change.added.map((v: string) => chalk.green(`+${v}`)).join(", ");
      parts.push(addedStr);
    }
    
    return `${field}: [${parts.join(", ")}]`;
  }

  private addCreationDetails(lines: string[], entity: Record<string, unknown>): void {
    const importantFields = ["currencyCode", "defaultCountry", "slug", "isShippingRequired"];
    
    for (const field of importantFields) {
      if (entity[field] !== undefined) {
        const value = typeof entity[field] === "boolean" 
          ? (entity[field] ? chalk.green("true") : chalk.red("false"))
          : chalk.cyan(String(entity[field]));
        lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${field}: ${value}`);
      }
    }
  }

  private addSummarySection(lines: string[], summary: DiffSummary): void {
    lines.push(chalk.bold.white(`${DIFF_ICONS.SUMMARY.CHART} Summary`));
    lines.push(chalk.gray(this.createSeparator(FORMAT_CONFIG.SUMMARY_WIDTH, FORMAT_CONFIG.SUB_SEPARATOR)));
    
    const changes: string[] = [];
    if (summary.creates > 0) {
      changes.push(chalk.green(`${summary.creates} to create`));
    }
    if (summary.updates > 0) {
      changes.push(chalk.yellow(`${summary.updates} to update`));
    }
    if (summary.deletes > 0) {
      changes.push(chalk.red(`${summary.deletes} to delete`));
    }
    
    lines.push(`Total: ${summary.totalChanges} changes (${changes.join(", ")})`);
    
    // Add note about attribute value removals
    const hasAttributeValueRemovals = summary.results.some(r => 
      r.operation === "UPDATE" && 
      r.changes?.some(c => c.field.includes("values") && c.currentValue && !c.desiredValue)
    );
    
    if (hasAttributeValueRemovals) {
      lines.push("");
      lines.push(chalk.gray("Note: Attribute value removals may fail if values are in use by products"));
    }
  }
}