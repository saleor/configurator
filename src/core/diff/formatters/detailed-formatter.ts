import chalk from "chalk";
import { DIFF_ICONS, DIFF_MESSAGES, FORMAT_CONFIG } from "../constants";
import type { DiffChange, DiffResult, DiffSummary, EntityType } from "../types";
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

  /**
   * Adds details for a specific diff result
   */
  private addResultDetails(lines: string[], result: DiffResult): void {
    const opIcon = this.getOperationIcon(result.operation);
    const opText = this.getOperationText(result.operation);
    const opColor = this.getOperationColor(result.operation);

    const entityName = chalk.cyan(`"${result.entityName}"`);
    const operation = opColor(opText);

    lines.push(`  ${opIcon} ${operation}: ${entityName}`);

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
  private formatFieldChange(change: DiffChange): string {
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
  private addOperationSpecificDetails(lines: string[], result: DiffResult): void {
    if (result.operation === "DELETE" && result.current) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${chalk.gray(
          DIFF_MESSAGES.DELETE_EXPLANATION(result.entityType)
        )}`
      );
    }

    if (result.operation === "CREATE" && result.desired) {
      this.addCreationDetails(lines, result.desired);
    }
  }

  /**
   * Adds specific details for entity creation
   */
  private addCreationDetails(lines: string[], entity: Record<string, unknown>): void {
    type VariantPreview = {
      sku?: string;
      name?: string;
      channelListings?: Array<{ channel?: string; price?: number } | undefined>;
    };
    type ProductPreview = {
      currencyCode?: string;
      defaultCountry?: string;
      productType?: string;
      category?: string;
      attributes?: Record<string, unknown>;
      variants?: VariantPreview[];
    } & Record<string, unknown>;

    const typedEntity = entity as ProductPreview;

    // Generic common fields
    if (typedEntity?.currencyCode) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} Currency: ${chalk.cyan(
          String(typedEntity.currencyCode)
        )}`
      );
    }

    if (typedEntity?.defaultCountry) {
      lines.push(
        `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} Country: ${chalk.cyan(
          String(typedEntity.defaultCountry)
        )}`
      );
    }

    // Product-specific preview: productType, category, attributes, variants
    if (typedEntity?.productType || typedEntity?.category) {
      if (typedEntity.productType) {
        lines.push(
          `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} productType: ${chalk.cyan(
            String(typedEntity.productType)
          )}`
        );
      }
      if (typedEntity.category) {
        lines.push(
          `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} category: ${chalk.cyan(
            String(typedEntity.category)
          )}`
        );
      }

      // Attributes (list each key/value)
      if (typedEntity.attributes && typeof typedEntity.attributes === "object") {
        const attrs = typedEntity.attributes as Record<string, unknown>;
        const keys = Object.keys(attrs);
        if (keys.length > 0) {
          lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} attributes:`);
          for (const key of keys) {
            const val = attrs[key];
            const valStr = Array.isArray(val)
              ? val.map((v) => chalk.cyan(String(v))).join(", ")
              : chalk.cyan(String(val));
            lines.push(`      ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${key}: ${valStr}`);
          }
        }
      }

      // Variants: preview SKU and channel pricing if provided
      if (Array.isArray(typedEntity.variants) && typedEntity.variants.length > 0) {
        lines.push(`    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} variants:`);
        for (const v of typedEntity.variants) {
          const sku = v?.sku ?? v?.name ?? "variant";
          lines.push(
            `      ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${chalk.white("SKU:")} ${chalk.cyan(String(sku))}`
          );
          if (Array.isArray(v?.channelListings) && v.channelListings.length > 0) {
            const parts = v.channelListings.map((cl) => {
              const ch = cl?.channel ?? "channel";
              const price =
                cl?.price !== undefined ? chalk.cyan(String(cl.price)) : chalk.gray("n/a");
              return `${chalk.white(ch)}=${price}`;
            });
            lines.push(
              `        ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} prices: ${parts.join(", ")}`
            );
          }
        }
      }
    }
  }

  /**
   * Adds the summary statistics section
   */
  private addSummarySection(lines: string[], summary: DiffSummary): void {
    lines.push(chalk.bold.white(`${DIFF_ICONS.SUMMARY.CHART} ${DIFF_MESSAGES.SUMMARY_HEADER}`));
    lines.push(
      chalk.gray(this.createSeparator(FORMAT_CONFIG.SUMMARY_WIDTH, FORMAT_CONFIG.SUB_SEPARATOR))
    );
    lines.push(DIFF_MESSAGES.TOTAL_CHANGES(summary.totalChanges));
    lines.push(
      `• ${chalk.green(summary.creates.toString())} ${this.formatPlural(
        summary.creates,
        "Creation"
      )}`
    );
    lines.push(
      `• ${chalk.yellow(summary.updates.toString())} ${this.formatPlural(
        summary.updates,
        "Update"
      )}`
    );
    lines.push(
      `• ${chalk.red(summary.deletes.toString())} ${this.formatPlural(summary.deletes, "Deletion")}`
    );
  }
}
