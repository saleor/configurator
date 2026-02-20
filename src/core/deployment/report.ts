import { writeFile } from "node:fs/promises";
import type { DiffResult, DiffSummary } from "../diff";
import type { DeploymentMetrics, StageResilienceMetrics } from "./types";
import { formatDuration } from "./utils";

/**
 * Empty resilience metrics used as default when no metrics are available
 */
const EMPTY_RESILIENCE_METRICS: StageResilienceMetrics = {
  rateLimitHits: 0,
  retryAttempts: 0,
  graphqlErrors: 0,
  networkErrors: 0,
};

export interface DeploymentReport {
  readonly timestamp: string;

  readonly summary: {
    readonly status: "success" | "partial" | "failed";
    readonly duration: {
      readonly totalMs: number;
      readonly formatted: string;
    };
    readonly changes: {
      readonly total: number;
      readonly created: number;
      readonly updated: number;
      readonly deleted: number;
    };
    readonly resilience: StageResilienceMetrics;
  };

  readonly stages: ReadonlyArray<{
    readonly name: string;
    readonly durationMs: number;
    readonly durationFormatted: string;
    readonly resilience: StageResilienceMetrics;
  }>;

  readonly changes: ReadonlyArray<{
    readonly entityType: string;
    readonly entityName: string;
    readonly operation: "CREATE" | "UPDATE" | "DELETE";
    readonly fields?: ReadonlyArray<{
      readonly field: string;
      readonly oldValue: unknown;
      readonly newValue: unknown;
    }>;
  }>;

  readonly entityCounts: Readonly<
    Record<
      string,
      {
        readonly created: number;
        readonly updated: number;
        readonly deleted: number;
      }
    >
  >;

  readonly metadata: {
    readonly startTime: string;
    readonly endTime: string;
  };
}

/**
 * Generates structured deployment reports for machine consumption
 * Includes timing, changes, resilience metrics, and entity breakdowns
 */
export class DeploymentReportGenerator {
  constructor(
    private readonly metrics: DeploymentMetrics,
    private readonly diffSummary: DiffSummary,
    private readonly status: "success" | "partial" | "failed" = "success"
  ) {}

  /**
   * Generate the complete deployment report
   * @returns Structured deployment report
   */
  generate(): DeploymentReport {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        status: this.status,
        duration: {
          totalMs: this.metrics.duration,
          formatted: formatDuration(this.metrics.duration),
        },
        changes: {
          total: this.diffSummary.totalChanges,
          created: this.diffSummary.creates,
          updated: this.diffSummary.updates,
          deleted: this.diffSummary.deletes,
        },
        resilience: {
          rateLimitHits: this.metrics.totalRateLimitHits,
          retryAttempts: this.metrics.totalRetries,
          graphqlErrors: this.metrics.totalGraphQLErrors,
          networkErrors: this.metrics.totalNetworkErrors,
        },
      },
      stages: this.formatStages(),
      changes: this.formatChanges(),
      entityCounts: this.formatEntityCounts(),
      metadata: {
        startTime: this.metrics.startTime.toISOString(),
        endTime: this.metrics.endTime.toISOString(),
      },
    };
  }

  /**
   * Save the deployment report as JSON to a file
   * @param path - File path to save the report
   */
  async saveToFile(path: string): Promise<void> {
    const report = this.generate();
    const json = JSON.stringify(report, null, 2);
    await writeFile(path, json, "utf-8");
  }

  private formatStages() {
    return Array.from(this.metrics.stageDurations, ([name, duration]) => ({
      name,
      durationMs: duration,
      durationFormatted: formatDuration(duration),
      resilience: this.metrics.stageResilience.get(name) ?? EMPTY_RESILIENCE_METRICS,
    }));
  }

  private formatChanges(): Array<{
    entityType: string;
    entityName: string;
    operation: "CREATE" | "UPDATE" | "DELETE";
    fields?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  }> {
    return this.diffSummary.results.map((result: DiffResult) => {
      const change: {
        entityType: string;
        entityName: string;
        operation: "CREATE" | "UPDATE" | "DELETE";
        fields?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
      } = {
        entityType: result.entityType,
        entityName: result.entityName,
        operation: result.operation,
      };

      if (result.changes && result.changes.length > 0) {
        change.fields = result.changes.map(
          (fieldChange: { field: string; currentValue: unknown; desiredValue: unknown }) => ({
            field: fieldChange.field,
            oldValue: fieldChange.currentValue ?? null,
            newValue: fieldChange.desiredValue ?? null,
          })
        );
      }

      return change;
    });
  }

  private formatEntityCounts(): Record<
    string,
    { created: number; updated: number; deleted: number }
  > {
    const counts: Record<string, { created: number; updated: number; deleted: number }> = {};

    for (const [type, count] of this.metrics.entityCounts) {
      counts[type] = {
        created: count.created,
        updated: count.updated,
        deleted: count.deleted,
      };
    }

    return counts;
  }
}
