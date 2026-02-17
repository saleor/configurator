import { resilienceTracker } from "../../lib/utils/resilience-tracker";
import type { DeploymentMetrics, EntityCount, StageResilienceMetrics } from "./types";

/**
 * Collects metrics during deployment including stage durations,
 * entity counts, and resilience statistics (rate limits, retries, errors)
 */
export class MetricsCollector {
  private readonly startTime = new Date();
  private endTime?: Date;
  private readonly stageDurations = new Map<string, number>();
  private readonly stageStartTimes = new Map<string, number>();
  private readonly entityCounts = new Map<string, EntityCount>();
  private readonly stageResilience = new Map<string, StageResilienceMetrics>();

  /**
   * Mark the start of a deployment stage
   * @param name - The name of the stage
   */
  startStage(name: string): void {
    this.stageStartTimes.set(name, Date.now());
    resilienceTracker.startStageContext(name);
  }

  /**
   * Mark the end of a deployment stage and capture its metrics
   * @param name - The name of the stage
   */
  endStage(name: string): void {
    const startTime = this.stageStartTimes.get(name);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.stageDurations.set(name, duration);
    this.stageStartTimes.delete(name);

    const resilienceMetrics = resilienceTracker.endStageContext();
    if (resilienceMetrics) {
      this.stageResilience.set(name, resilienceMetrics);
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

  /**
   * Mark the deployment as complete and return final metrics
   * @returns Complete deployment metrics
   */
  complete(): DeploymentMetrics {
    this.endTime = new Date();
    const totals = this.aggregateResilienceTotals();

    return {
      duration: this.endTime.getTime() - this.startTime.getTime(),
      startTime: this.startTime,
      endTime: this.endTime,
      stageDurations: new Map(this.stageDurations),
      entityCounts: new Map(this.entityCounts),
      stageResilience: new Map(this.stageResilience),
      ...totals,
    };
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
      ...totals,
    };
  }
}
