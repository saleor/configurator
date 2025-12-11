import type { DiffSummary } from "../types";
import { BaseDiffFormatter } from "./base-formatter";
import {
  createGitHubActionsOutputs,
  type DiffEntityResult,
  type DiffJsonOutput,
  type DiffJsonSummary,
  type EntityTypeChanges,
  type JsonFormatOptions,
  toDiffEntityResult,
} from "./ci-types";

/**
 * Formatter that outputs diff results as JSON for CI/CD integration
 *
 * Provides machine-readable output with:
 * - Structured summary statistics
 * - Changes grouped by entity type
 * - GitHub Actions compatible outputs
 * - Severity classification for CI decision making
 */
export class JsonDiffFormatter extends BaseDiffFormatter {
  private options: JsonFormatOptions;

  constructor(options: JsonFormatOptions = {}) {
    super();
    this.options = {
      prettyPrint: true,
      ...options,
    };
  }

  /**
   * Formats the diff summary as a JSON string
   */
  format(summary: DiffSummary): string {
    this.validateSummary(summary);
    const output = this.buildJsonOutput(summary);
    return this.options.prettyPrint ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  }

  /**
   * Builds the complete JSON output structure
   */
  buildJsonOutput(summary: DiffSummary): DiffJsonOutput {
    this.validateSummary(summary);

    const entityResults = summary.results.map(toDiffEntityResult);
    const byEntityType = this.groupResultsByEntityType(entityResults, summary);

    return {
      version: "1.0",
      timestamp: new Date().toISOString(),
      saleorUrl: this.options.saleorUrl,
      configFile: this.options.configFile,
      summary: this.buildSummary(summary),
      byEntityType,
      changes: entityResults,
      outputs: createGitHubActionsOutputs(summary),
    };
  }

  /**
   * Builds the summary section
   */
  private buildSummary(summary: DiffSummary): DiffJsonSummary {
    return {
      totalChanges: summary.totalChanges,
      creates: summary.creates,
      updates: summary.updates,
      deletes: summary.deletes,
      hasBreakingChanges:
        summary.deletes > 0 ||
        summary.results.some(
          (r) => r.operation === "UPDATE" && r.changes?.some((c) => this.isBreakingField(c.field))
        ),
      hasDeletions: summary.deletes > 0,
    };
  }

  /**
   * Groups results by entity type with counts
   */
  private groupResultsByEntityType(
    entityResults: DiffEntityResult[],
    summary: DiffSummary
  ): Record<string, EntityTypeChanges> {
    const grouped = this.groupByEntityType(summary.results);
    const result: Record<string, EntityTypeChanges> = {};

    for (const [entityType, results] of grouped) {
      const creates = results.filter((r) => r.operation === "CREATE").length;
      const updates = results.filter((r) => r.operation === "UPDATE").length;
      const deletes = results.filter((r) => r.operation === "DELETE").length;

      result[entityType] = {
        creates,
        updates,
        deletes,
        entities: entityResults.filter((er) => er.entityType === entityType),
      };
    }

    return result;
  }

  /**
   * Checks if a field change is considered breaking
   */
  private isBreakingField(field: string): boolean {
    const breakingFields = ["slug", "productType", "inputType", "type"];
    return breakingFields.includes(field);
  }
}

/**
 * Factory function for creating JSON formatters
 */
export function createJsonFormatter(options?: JsonFormatOptions): JsonDiffFormatter {
  return new JsonDiffFormatter(options);
}
