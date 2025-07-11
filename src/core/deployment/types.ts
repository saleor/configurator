import type { DeployCommandArgs } from "../../commands/deploy";
import type { SaleorConfigurator } from "../configurator";
import type { DiffSummary } from "../diff";

export interface DeploymentContext {
  readonly configurator: SaleorConfigurator;
  readonly args: DeployCommandArgs;
  readonly summary: DiffSummary;
  readonly startTime: Date;
}

export interface DeploymentStage {
  readonly name: string;
  execute(context: DeploymentContext): Promise<void>;
  skip?(context: DeploymentContext): boolean;
}

export interface DeploymentMetrics {
  readonly duration: number;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly stageDurations: ReadonlyMap<string, number>;
  readonly entityCounts: ReadonlyMap<string, EntityCount>;
}

export interface EntityCount {
  readonly created: number;
  readonly updated: number;
  readonly deleted: number;
}