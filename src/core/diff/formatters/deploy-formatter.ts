import chalk from "chalk";
import { DIFF_ICONS, DIFF_MESSAGES, FORMAT_CONFIG } from "../constants";
import type { DiffChange, DiffResult, DiffSummary, EntityType } from "../types";
import { BaseDiffFormatter } from "./base-formatter";

interface ArrayChangeGroup {
  field: string;
  isArrayChange: true;
  added: string[];
  removed: string[];
  entityName: string;
}

/**
 * Formatter for deploy command with enhanced change visualization
 */
export class DeployDiffFormatter extends BaseDiffFormatter {
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
    const icon = this.getEntityIcon(entityType);
    lines.push(chalk.bold.white(`${icon} ${entityType}`));
    lines.push(
      chalk.gray(this.createSeparator(entityType.length + 2, FORMAT_CONFIG.SUB_SEPARATOR))
    );

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
      // Group changes by field for array values
      const groupedChanges = this.groupArrayChanges(result.changes);

      for (const change of groupedChanges) {
        const changeDescription = this.formatFieldChange(change);
        lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${changeDescription}`);
      }
    }

    // Add creation details
    if (result.operation === "CREATE" && result.desired) {
      this.addCreationDetails(lines, result.desired);
    }

    // Add deletion warning
    if (result.operation === "DELETE") {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${chalk.red(
          "⚠️  This will be permanently deleted"
        )}`
      );
    }

    lines.push("");
  }

  private groupArrayChanges(changes: readonly DiffChange[]): (DiffChange | ArrayChangeGroup)[] {
    // Group changes by field name
    const fieldGroups = new Map<string, DiffChange[]>();
    const nonArrayChanges: DiffChange[] = [];

    for (const change of changes) {
      // Check if this is an array value change (ends with .values)
      if (change.field.endsWith(".values")) {
        const existingChanges = fieldGroups.get(change.field) || [];
        existingChanges.push(change);
        fieldGroups.set(change.field, existingChanges);
      } else {
        nonArrayChanges.push(change);
      }
    }

    // Convert grouped array changes into single entries
    const consolidatedChanges: (DiffChange | ArrayChangeGroup)[] = [...nonArrayChanges];

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
          removed,
        });
      }
    }

    return consolidatedChanges;
  }

  private formatFieldChange(change: DiffChange | ArrayChangeGroup): string {
    // Handle array changes specially
    if ("isArrayChange" in change && change.isArrayChange) {
      return this.formatArrayChange(change);
    }

    // Now TypeScript knows change is DiffChange
    const diffChange = change as DiffChange;

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
      if (Array.isArray(value) || typeof value === "object") {
        try {
          return chalk.white(JSON.stringify(value));
        } catch {
          return chalk.white(String(value));
        }
      }
      return chalk.white(`"${String(value)}"`);
    };

    const field = chalk.yellow(diffChange.field);
    const oldValue = formatValue(diffChange.currentValue);
    const newValue = formatValue(diffChange.desiredValue);

    return `${field}: ${oldValue} ${chalk.gray("→")} ${newValue}`;
  }

  private formatArrayChange(change: ArrayChangeGroup): string {
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
    type VariantPreview = {
      sku?: string;
      name?: string;
      channelListings?: Array<{ channel?: string; price?: number } | undefined>;
    };
    type ProductPreview = {
      productType?: string;
      category?: string;
      attributes?: Record<string, unknown>;
      variants?: VariantPreview[];
    } & Record<string, unknown>;

    const e = entity as ProductPreview;
    const importantFields = [
      "currencyCode",
      "defaultCountry",
      "slug",
      "isShippingRequired",
    ] as const;

    for (const field of importantFields) {
      if (e[field] !== undefined) {
        const value =
          typeof e[field] === "boolean"
            ? e[field]
              ? chalk.green("true")
              : chalk.red("false")
            : chalk.cyan(String(e[field]));
        lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${field}: ${value}`);
      }
    }

    // Product-specific: productType, category
    if (e?.productType) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} productType: ${chalk.cyan(String(e.productType))}`
      );
    }
    if (e?.category) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} category: ${chalk.cyan(String(e.category))}`
      );
    }

    // Attributes
    if (e?.attributes && typeof e.attributes === "object") {
      const attrs = e.attributes as Record<string, unknown>;
      const keys = Object.keys(attrs);
      if (keys.length > 0) {
        lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} attributes:`);
        for (const key of keys) {
          const val = attrs[key];
          const formatted = Array.isArray(val)
            ? val.map((v) => chalk.cyan(String(v))).join(", ")
            : chalk.cyan(String(val));
          lines.push(`      ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${key}: ${formatted}`);
        }
      }
    }

    // Variant preview: SKU + channel prices
    if (Array.isArray(e?.variants) && e.variants.length > 0) {
      lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} variants:`);
      for (const v of e.variants) {
        const sku = v?.sku ?? v?.name ?? "variant";
        lines.push(
          `      ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${chalk.white("SKU:")} ${chalk.cyan(String(sku))}`
        );
        if (Array.isArray(v?.channelListings) && v.channelListings.length > 0) {
          const list = v.channelListings.map((cl) => {
            const ch = cl?.channel ?? "channel";
            const price =
              cl?.price !== undefined ? chalk.cyan(String(cl.price)) : chalk.gray("n/a");
            return `${chalk.white(ch)}=${price}`;
          });
          lines.push(`        ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} prices: ${list.join(", ")}`);
        }
      }
    }
  }

  private addSummarySection(lines: string[], summary: DiffSummary): void {
    lines.push(chalk.bold.white(`${DIFF_ICONS.SUMMARY.CHART} Summary`));
    lines.push(
      chalk.gray(this.createSeparator(FORMAT_CONFIG.SUMMARY_WIDTH, FORMAT_CONFIG.SUB_SEPARATOR))
    );

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
    const hasAttributeValueRemovals = summary.results.some(
      (r) =>
        r.operation === "UPDATE" &&
        r.changes?.some((c) => c.field.includes("values") && c.currentValue && !c.desiredValue)
    );

    if (hasAttributeValueRemovals) {
      lines.push("");
      lines.push(
        chalk.gray("Note: Attribute value removals may fail if values are in use by products")
      );
    }
  }
}
