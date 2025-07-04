import type { DiffSummary, DiffResult } from "../types";
import { BaseDiffFormatter } from "./base-formatter";
import { DIFF_ICONS, FORMAT_CONFIG } from "../constants";

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
    const icon = this.getEntityIcon(entityType as any);
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
      const description = `${change.field}: "${change.desiredValue}" → "${change.currentValue}"`;
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
    const typedEntity = entity as any;

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
    lines.push(`${DIFF_ICONS.SUMMARY.CHART} Summary of Local File Changes`);
    lines.push(this.createSeparator(25, FORMAT_CONFIG.SUB_SEPARATOR));
    lines.push(`Total Changes: ${summary.totalChanges}`);
    lines.push(`• ${summary.creates} ${this.formatPlural(summary.creates, "addition")}`);
    lines.push(`• ${summary.updates} ${this.formatPlural(summary.updates, "update")}`);
    lines.push(`• ${summary.deletes} ${this.formatPlural(summary.deletes, "removal")}`);
  }
} 