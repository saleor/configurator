import chalk from "chalk";
import { DIFF_ICONS, DIFF_MESSAGES, FORMAT_CONFIG } from "../constants";
import { countAppliedChanges } from "../diff-operations";
import { renderChanges } from "../render-change";
import type { DiffResult, DiffSummary, EntityType } from "../types";
import { BaseDiffFormatter } from "./base-formatter";

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

    if (result.operation === "UPDATE" && result.changes && result.changes.length > 0) {
      for (const { label, summary } of renderChanges(result.changes, "deploy")) {
        lines.push(
          `    ${chalk.gray(FORMAT_CONFIG.TREE_BRANCH)} ${chalk.yellow(label)}: ${summary}`
        );
      }
    }

    // Add creation details
    if (result.operation === "CREATE" && result.desired) {
      this.addCreationDetails(lines, result.desired);
    }

    lines.push("");
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
    const applied = countAppliedChanges(summary);
    lines.push(
      changes.length > 0
        ? `Total: ${applied} ${applied === 1 ? "change" : "changes"} (${changes.join(", ")})`
        : "Total: no changes to apply"
    );
    if (summary.deletes > 0) {
      lines.push(chalk.gray(`${summary.deletes} only in Saleor: deploy leaves them in place`));
    }

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
