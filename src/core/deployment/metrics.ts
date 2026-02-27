import { resilienceTracker } from "../../lib/utils/resilience-tracker";
import type {
  DeploymentMetrics,
  EntityCount,
  OperationResilienceMetrics,
  StageResilienceMetrics,
} from "./types";

/**
 * Collects metrics during deployment including stage durations,
 * entity counts, and resilience statistics (rate limits, retries, errors)
 */
export class MetricsCollector {
  private readonly startTime = new Date();
  private endTime?: Date;
  private readonly stageDurations = new Map<string, number>();
  private readonly entityCounts = new Map<string, EntityCount>();
  private readonly stageResilience = new Map<string, StageResilienceMetrics>();

  /**
   * Execute a stage within an isolated resilience context.
   * Uses storage.run() to scope metrics to this stage's async tree,
   * preventing metric attribution leaks across stage boundaries.
   */
  async runStage<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const { result, metrics } = await resilienceTracker.runInStageContext(name, fn);
      this.stageResilience.set(name, metrics);
      return result;
    } finally {
      const duration = Date.now() - startTime;
      this.stageDurations.set(name, duration);
    }
  }

  /**
   * Record an entity operation for metrics tracking
   * @param type - The entity type (e.g., "Products", "Categories")
   * @param operation - The operation performed
   */
  recordEntity(type: string, operation: "create" | "update" | "delete"): void {
    const current = this.entityCounts.get(type) ?? {
      created: 0,
      updated: 0,
      deleted: 0,
    };

    const operationToProperty = {
      create: "created",
      update: "updated",
      delete: "deleted",
    } as const;
    const propertyName = operationToProperty[operation];

    this.entityCounts.set(type, {
      ...current,
      [propertyName]: current[propertyName] + 1,
    });
  }

  private aggregateResilienceTotals(): {
    totalRateLimitHits: number;
    totalRetries: number;
    totalGraphQLErrors: number;
    totalNetworkErrors: number;
  } {
    let totalRateLimitHits = 0;
    let totalRetries = 0;
    let totalGraphQLErrors = 0;
    let totalNetworkErrors = 0;

    for (const metrics of this.stageResilience.values()) {
      totalRateLimitHits += metrics.rateLimitHits;
      totalRetries += metrics.retryAttempts;
      totalGraphQLErrors += metrics.graphqlErrors;
      totalNetworkErrors += metrics.networkErrors;
    }

    return { totalRateLimitHits, totalRetries, totalGraphQLErrors, totalNetworkErrors };
  }

  private aggregateOperationResilience(): ReadonlyMap<string, OperationResilienceMetrics> {
    const aggregated = new Map<string, OperationResilienceMetrics>();

    for (const stageMetrics of this.stageResilience.values()) {
      if (!stageMetrics.operations) {
        continue;
      }

      for (const [operation, metrics] of Object.entries(stageMetrics.operations)) {
        const current = aggregated.get(operation) ?? {
          rateLimitHits: 0,
          retryAttempts: 0,
          graphqlErrors: 0,
          networkErrors: 0,
        };

        aggregated.set(operation, {
          rateLimitHits: current.rateLimitHits + metrics.rateLimitHits,
          retryAttempts: current.retryAttempts + metrics.retryAttempts,
          graphqlErrors: current.graphqlErrors + metrics.graphqlErrors,
          networkErrors: current.networkErrors + metrics.networkErrors,
        });
      }
    }

    return aggregated;
  }

  /**
   * Mark the deployment as complete and return final metrics
   * @returns Complete deployment metrics
   */
  complete(): DeploymentMetrics {
    this.endTime = new Date();
    return this.getMetrics();
  }

  /**
   * Get current deployment metrics (for in-progress deployments)
   * @returns Current deployment metrics snapshot
   */
  getMetrics(): DeploymentMetrics {
    const endTime = this.endTime ?? new Date();
    const totals = this.aggregateResilienceTotals();

    return {
      duration: endTime.getTime() - this.startTime.getTime(),
      startTime: this.startTime,
      endTime,
      stageDurations: new Map(this.stageDurations),
      entityCounts: new Map(this.entityCounts),
      stageResilience: new Map(this.stageResilience),
      operationResilience: this.aggregateOperationResilience(),
      ...totals,
    };
  }
}
