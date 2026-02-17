import type { DeployCommandArgs } from "../../commands/deploy";
import type { SaleorConfigurator } from "../configurator";
import type { DiffSummary } from "../diff";

export interface DeploymentContext {
  readonly configurator: SaleorConfigurator;
  readonly args: DeployCommandArgs;
  readonly summary: DiffSummary;
  readonly startTime: Date;
  // Note: skipMedia is accessed via args.skipMedia to avoid duplication
}

export interface DeploymentStage {
  readonly name: string;
  execute(context: DeploymentContext): Promise<void>;
  skip?(context: DeploymentContext): boolean;
}

/**
 * Resilience metrics tracked per deployment stage
 */
export interface StageResilienceMetrics {
  readonly rateLimitHits: number;
  readonly retryAttempts: number;
  readonly graphqlErrors: number;
  readonly networkErrors: number;
}

export interface DeploymentMetrics {
  readonly duration: number;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly stageDurations: ReadonlyMap<string, number>;
  readonly entityCounts: ReadonlyMap<string, EntityCount>;
  readonly stageResilience: ReadonlyMap<string, StageResilienceMetrics>;
  readonly totalRateLimitHits: number;
  readonly totalRetries: number;
  readonly totalGraphQLErrors: number;
  readonly totalNetworkErrors: number;
}

export interface EntityCount {
  readonly created: number;
  readonly updated: number;
  readonly deleted: number;
}
