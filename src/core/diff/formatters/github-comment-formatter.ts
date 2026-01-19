import type { DiffResult, DiffSummary, EntityType } from "../types";
import { BaseDiffFormatter } from "./base-formatter";
import { type ChangeSeverity, classifyChangeSeverity } from "./ci-types";
import { FORMATTER_LIMITS } from "./constants";

/**
 * Options for GitHub comment formatting
 */
export interface GitHubCommentFormatOptions {
  /** Saleor URL for context */
  readonly saleorUrl?: string;
  /** Config file path for context */
  readonly configFile?: string;
  /** Whether to include collapsible details sections */
  readonly includeDetails?: boolean;
  /** Maximum number of entities to show per section before collapsing */
  readonly maxEntitiesPerSection?: number;
}

/**
 * Formatter that outputs diff results as GitHub-flavored Markdown
 * suitable for PR comments
 *
 * Features:
 * - Summary table with change counts
 * - Status badges (success/warning/critical)
 * - Collapsible details for each entity type
 * - Warning callouts for destructive changes
 * - Footer with metadata
 */
export class GitHubCommentFormatter extends BaseDiffFormatter {
  private options: GitHubCommentFormatOptions;

  constructor(options: GitHubCommentFormatOptions = {}) {
    super();
    this.options = {
      includeDetails: true,
      maxEntitiesPerSection: 10,
      ...options,
    };
  }

  /**
   * Formats the diff summary as GitHub-flavored Markdown
   */
  format(summary: DiffSummary): string {
    this.validateSummary(summary);

    const lines: string[] = [];

    // Header with status
    lines.push(this.formatHeader(summary));
    lines.push("");

    // Summary table
    lines.push(this.formatSummaryTable(summary));
    lines.push("");

    // Warning callouts for destructive changes
    if (summary.deletes > 0) {
      lines.push(this.formatDeletionWarning(summary));
      lines.push("");
    }

    // Collapsible details per entity type
    if (this.options.includeDetails && summary.totalChanges > 0) {
      const grouped = this.groupByEntityType(summary.results);
      for (const [entityType, results] of grouped) {
        lines.push(this.formatEntitySection(entityType, results));
        lines.push("");
      }
    }

    // Footer
    lines.push(this.formatFooter());

    return lines.join("\n");
  }

  /**
   * Formats the header with appropriate status badge
   */
  private formatHeader(summary: DiffSummary): string {
    const status = this.getOverallStatus(summary);

    let badge: string;
    switch (status) {
      case "critical":
        badge = ":x: **Breaking changes detected**";
        break;
      case "warning":
        badge = ":warning: **Contains deletions**";
        break;
      case "info":
        if (summary.totalChanges > 0) {
          badge = ":eyes: **Changes detected**";
        } else {
          badge = ":white_check_mark: **No changes**";
        }
        break;
    }

    return `## Saleor Configuration Changes\n\n${badge}`;
  }

  /**
   * Formats the summary table
   */
  private formatSummaryTable(summary: DiffSummary): string {
    if (summary.totalChanges === 0) {
      return "Your local configuration matches the remote Saleor instance.";
    }

    const lines = [
      "### Summary",
      "",
      "| Operation | Count |",
      "|-----------|-------|",
      `| :heavy_plus_sign: Create | ${summary.creates} |`,
      `| :pencil2: Update | ${summary.updates} |`,
      `| :heavy_minus_sign: Delete | ${summary.deletes} |`,
      `| **Total** | **${summary.totalChanges}** |`,
    ];

    return lines.join("\n");
  }

  /**
   * Formats a warning callout for deletions
   */
  private formatDeletionWarning(summary: DiffSummary): string {
    const deleteResults = summary.results.filter((r) => r.operation === "DELETE");

    const lines = [
      "> :warning: **Destructive Changes Detected**",
      ">",
      `> This deployment will delete ${summary.deletes} ${this.formatPlural(summary.deletes, "entity", "entities")}. Review carefully before merging.`,
    ];

    // List the entities being deleted
    const toShow = deleteResults.slice(0, FORMATTER_LIMITS.MAX_DELETIONS_TO_LIST);
    lines.push(...toShow.map((result) => `> - ${result.entityType}: \`${result.entityName}\``));

    if (deleteResults.length > FORMATTER_LIMITS.MAX_DELETIONS_TO_LIST) {
      lines.push(
        `> - _...and ${deleteResults.length - FORMATTER_LIMITS.MAX_DELETIONS_TO_LIST} more_`
      );
    }

    return lines.join("\n");
  }

  /**
   * Formats a group of operations (creates, updates, or deletes) for display
   */
  private formatOperationGroup(
    title: string,
    results: readonly DiffResult[],
    formatItem: (result: DiffResult) => string
  ): string[] {
    if (results.length === 0) return [];

    const maxPerSection =
      this.options.maxEntitiesPerSection ?? FORMATTER_LIMITS.MAX_ENTITIES_PER_SECTION;
    const lines = [`#### ${title}`, ...results.slice(0, maxPerSection).map(formatItem)];

    if (results.length > maxPerSection) {
      lines.push(`- _...and ${results.length - maxPerSection} more ${title.toLowerCase()}_`);
    }

    lines.push("");
    return lines;
  }

  /**
   * Formats a collapsible section for an entity type
   */
  private formatEntitySection(entityType: EntityType, results: readonly DiffResult[]): string {
    const creates = results.filter((r) => r.operation === "CREATE");
    const updates = results.filter((r) => r.operation === "UPDATE");
    const deletes = results.filter((r) => r.operation === "DELETE");

    const hasDeletes = deletes.length > 0;
    const warningIndicator = hasDeletes ? " :warning:" : "";

    const lines = [
      `<details>`,
      `<summary><strong>${entityType}</strong> (${results.length} ${this.formatPlural(results.length, "change")})${warningIndicator}</summary>`,
      "",
    ];

    // Add each operation group using the helper
    lines.push(
      ...this.formatOperationGroup(
        "Creates",
        creates,
        (r) => `- :heavy_plus_sign: \`${r.entityName}\``
      )
    );
    lines.push(...this.formatOperationGroup("Updates", updates, (r) => this.formatUpdateResult(r)));
    lines.push(
      ...this.formatOperationGroup(
        "Deletes",
        deletes,
        (r) => `- :heavy_minus_sign: \`${r.entityName}\``
      )
    );

    lines.push("</details>");

    return lines.join("\n");
  }

  /**
   * Formats an UPDATE result with field changes
   */
  private formatUpdateResult(result: DiffResult): string {
    const changes = result.changes || [];

    if (changes.length === 0) {
      return `- :pencil2: \`${result.entityName}\``;
    }

    const lines = [`- :pencil2: \`${result.entityName}\``];

    for (const change of changes.slice(0, FORMATTER_LIMITS.MAX_FIELD_CHANGES)) {
      const oldVal = this.formatValue(change.currentValue);
      const newVal = this.formatValue(change.desiredValue);
      lines.push(`  - \`${change.field}\`: ${oldVal} -> ${newVal}`);
    }

    if (changes.length > FORMATTER_LIMITS.MAX_FIELD_CHANGES) {
      lines.push(
        `  - _...and ${changes.length - FORMATTER_LIMITS.MAX_FIELD_CHANGES} more changes_`
      );
    }

    return lines.join("\n");
  }

  /**
   * Formats a value for display (truncated if too long)
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "_null_";
    }

    if (typeof value === "string") {
      if (value.length > FORMATTER_LIMITS.MAX_VALUE_LENGTH) {
        return `\`${value.slice(0, FORMATTER_LIMITS.MAX_VALUE_LENGTH - 3)}...\``;
      }
      return `\`${value}\``;
    }

    if (typeof value === "boolean" || typeof value === "number") {
      return `\`${value}\``;
    }

    if (Array.isArray(value)) {
      return `_[${value.length} items]_`;
    }

    if (typeof value === "object") {
      return "_[object]_";
    }

    return String(value);
  }

  /**
   * Formats the footer with metadata
   */
  private formatFooter(): string {
    const lines = ["---"];

    const metadata: string[] = [];
    if (this.options.configFile) {
      metadata.push(`Config: \`${this.options.configFile}\``);
    }
    if (this.options.saleorUrl) {
      // Extract just the hostname for cleaner display
      try {
        const url = new URL(this.options.saleorUrl);
        metadata.push(`Saleor: \`${url.hostname}\``);
      } catch {
        metadata.push(`Saleor: \`${this.options.saleorUrl}\``);
      }
    }

    if (metadata.length > 0) {
      lines.push(`<sub>${metadata.join(" | ")}</sub>`);
      lines.push("");
    }

    lines.push("_Generated by [Saleor Configurator](https://github.com/saleor/configurator)_");

    return lines.join("\n");
  }

  /**
   * Gets the overall status/severity for the diff
   */
  private getOverallStatus(summary: DiffSummary): ChangeSeverity {
    if (summary.deletes > 0) {
      return "critical";
    }

    // Check for breaking changes in updates
    for (const result of summary.results) {
      if (classifyChangeSeverity(result) === "critical") {
        return "critical";
      }
    }

    if (summary.totalChanges > 0) {
      return "info";
    }

    return "info";
  }
}

/**
 * Factory function for creating GitHub comment formatters
 */
export function createGitHubCommentFormatter(
  options?: GitHubCommentFormatOptions
): GitHubCommentFormatter {
  return new GitHubCommentFormatter(options);
}
