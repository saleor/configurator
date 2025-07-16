import { ProgressIndicator } from "./progress";
import { logger } from "../../lib/logger";
import { MetricsCollector } from "./metrics";
import type { DeploymentContext, DeploymentMetrics, DeploymentStage } from "./types";

export class DeploymentPipeline {
  private readonly stages: DeploymentStage[] = [];
  private readonly progress = new ProgressIndicator();
  private readonly metrics = new MetricsCollector();

  addStage(stage: DeploymentStage): this {
    this.stages.push(stage);
    return this;
  }

  async execute(context: DeploymentContext): Promise<DeploymentMetrics> {
    logger.info("Starting deployment pipeline", {
      stageCount: this.stages.length,
    });

    for (const stage of this.stages) {
      if (stage.skip?.(context)) {
        logger.debug(`Skipping stage: ${stage.name}`);
        continue;
      }

      await this.executeStage(stage, context);
    }

    return this.metrics.complete();
  }

  private async executeStage(
    stage: DeploymentStage,
    context: DeploymentContext
  ): Promise<void> {
    const stopSpinner = this.progress.startSpinner(stage.name);
    this.metrics.startStage(stage.name);

    try {
      await stage.execute(context);
      
      this.metrics.endStage(stage.name);
      stopSpinner();
      
      const duration = this.metrics.getMetrics().stageDurations.get(stage.name);
      const durationStr = duration ? ` (${(duration / 1000).toFixed(1)}s)` : "";
      this.progress.complete(`${stage.name}${durationStr}`);
      
      logger.debug(`Stage completed: ${stage.name}`, { duration });
    } catch (error) {
      stopSpinner();
      this.progress.fail(`${stage.name} - Failed`);
      
      logger.error(`Stage failed: ${stage.name}`, { error });
      throw new Error(
        `Deployment failed during "${stage.name}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}