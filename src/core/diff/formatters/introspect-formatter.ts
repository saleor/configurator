import { DIFF_ICONS, FORMAT_CONFIG } from "../constants";
import type { DiffResult, DiffSummary, EntityType } from "../types";
import { BaseDiffFormatter } from "./base-formatter";

/**
 * Formatter for introspect diff output - shows what will change in local config
 * when pulling from remote
 */
export class IntrospectDiffFormatter extends BaseDiffFormatter {
  /**
   * Formats a diff summary for introspect operation
   */
  format(summary: DiffSummary): string {
    this.validateSummary(summary);

    if (summary.totalChanges === 0) {
      return `${DIFF_ICONS.SUMMARY.SUCCESS} Local configuration is already up to date with Saleor!`;
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
    lines.push(`${DIFF_ICONS.SUMMARY.RESULTS} Local Configuration Update Preview`);
    lines.push(this.createSeparator(FORMAT_CONFIG.HEADER_WIDTH));
    lines.push("");
  }

  /**
   * Adds the introduction text
   */
  private addIntroduction(lines: string[]): void {
    lines.push("The following changes will be made to your local configuration file");
    lines.push("when pulling the current state from Saleor:");
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
    const icon = this.getEntityIcon(entityType as EntityType);
    lines.push(`${icon} ${entityType}`);
    lines.push(this.createSeparator(entityType.length + 2, FORMAT_CONFIG.SUB_SEPARATOR));

    for (const result of results) {
      this.addResultDetails(lines, result);
    }
  }

  /**
   * Adds details for a specific diff result
   * For introspect, we need to interpret operations from the local file perspective:
   * - CREATE in diff means ADD to local file (from remote)
   * - DELETE in diff means REMOVE from local file (not in remote)
   * - UPDATE means MODIFY in local file
   */
  private addResultDetails(lines: string[], result: DiffResult): void {
    const opIcon = this.getOperationIcon(result.operation);
    let description = "";

    switch (result.operation) {
      case "CREATE":
        // Remote has it, local doesn't - will be added to local
        description = `Will be added: "${result.entityName}"`;
        break;
      case "DELETE":
        // Local has it, remote doesn't - will be removed from local
        description = `Will be removed: "${result.entityName}" (not present on Saleor)`;
        break;
      case "UPDATE":
        // Both have it but different - will be updated in local
        description = `Will be updated: "${result.entityName}"`;
        break;
    }

    lines.push(`  ${opIcon} ${description}`);

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
      // For introspect, current = remote value, desired = local value
      // We're showing what the local value will become (current/remote value)
      const description = `${change.field}: "${this.formatValue(
        change.desiredValue
      )}" → "${this.formatValue(change.currentValue)}"`;
      lines.push(`    ${FORMAT_CONFIG.TREE_BRANCH} ${description}`);
    }
  }

  /**
   * Adds operation-specific additional details
   */
  private addOperationSpecificDetails(lines: string[], result: DiffResult): void {
    if (result.operation === "CREATE" && result.desired) {
      // Show what will be added from remote
      this.addCreationDetails(lines, result.desired);
    }
  }

  /**
   * Adds specific details for entity creation
   */
  private addCreationDetails(lines: string[], entity: unknown): void {
    // Type guard for entity with known properties
    const typedEntity = entity as Record<string, unknown>;

    if (typedEntity?.currencyCode) {
      lines.push(`    ${FORMAT_CONFIG.TREE_BRANCH} Currency: ${typedEntity.currencyCode}`);
    }

    if (typedEntity?.defaultCountry) {
      lines.push(`    ${FORMAT_CONFIG.TREE_BRANCH} Country: ${typedEntity.defaultCountry}`);
    }

    // For product types, show attributes that will be added
    if (typedEntity?.attributes && Array.isArray(typedEntity.attributes)) {
      for (const attr of typedEntity.attributes) {
        lines.push(`    ${FORMAT_CONFIG.TREE_BRANCH} Attribute: ${attr.name}`);
      }
    }
  }

  /**
   * Adds the summary statistics section
   */
  private addSummarySection(lines: string[], summary: DiffSummary): void {
    lines.push("");
    lines.push(this.createSeparator(FORMAT_CONFIG.HEADER_WIDTH));

    // Group changes by entity type for better overview
    const entityCounts = new Map<EntityType, number>();
    for (const result of summary.results) {
      entityCounts.set(result.entityType, (entityCounts.get(result.entityType) || 0) + 1);
    }

    lines.push(`${DIFF_ICONS.SUMMARY.CHART} Summary by type:`);
    for (const [entityType, count] of entityCounts) {
      const icon = this.getEntityIcon(entityType);
      lines.push(`  ${icon} ${entityType}: ${count} ${this.formatPlural(count, "change")}`);
    }

    lines.push("");
    lines.push(`Total changes: ${summary.totalChanges}`);
    const parts: string[] = [];
    if (summary.creates > 0) {
      parts.push(`${DIFF_ICONS.OPERATIONS.CREATE} ${summary.creates} new`);
    }
    if (summary.updates > 0) {
      parts.push(`${DIFF_ICONS.OPERATIONS.UPDATE} ${summary.updates} modified`);
    }
    if (summary.deletes > 0) {
      parts.push(`${DIFF_ICONS.OPERATIONS.DELETE} ${summary.deletes} removed`);
    }

    if (parts.length > 0) {
      lines.push(`  ${parts.join(", ")}`);
    }
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[object]";
      }
    }
    return String(value);
  }
}
