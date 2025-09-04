import { logger } from "../../lib/logger";
import { MetricsCollector } from "./metrics";
import { ProgressIndicator } from "./progress";
import { 
  DeploymentResultCollector, 
  DeploymentResultFormatter,
  extractEntityResults,
  type DeploymentResult, 
  type StageStatus 
} from "./results";
import { StageAggregateError } from "./errors";
import type { DeploymentContext, DeploymentMetrics, DeploymentStage } from "./types";

export class EnhancedDeploymentPipeline {
  private readonly stages: DeploymentStage[] = [];
  private readonly progress = new ProgressIndicator();
  private readonly metrics = new MetricsCollector();
  private readonly resultCollector = new DeploymentResultCollector();

  addStage(stage: DeploymentStage): this {
    this.stages.push(stage);
    return this;
  }

  async execute(context: DeploymentContext): Promise<{ metrics: DeploymentMetrics; result: DeploymentResult }> {
    logger.info("Starting enhanced deployment pipeline", {
      stageCount: this.stages.length,
    });

    for (const stage of this.stages) {
      if (stage.skip?.(context)) {
        logger.debug(`Skipping stage: ${stage.name}`);
        this.handleSkippedStage(stage);
        continue;
      }

      await this.executeStageWithResultCollection(stage, context);
    }

    const metrics = this.metrics.complete();
    const result = this.resultCollector.getResult();

    return { metrics, result };
  }

  private handleSkippedStage(stage: DeploymentStage): void {
    const stageResult = this.resultCollector.createStageResult(
      stage.name,
      'skipped',
      new Date(),
      new Date()
    );
    this.resultCollector.addStageResult(stageResult);
  }

  private async executeStageWithResultCollection(
    stage: DeploymentStage, 
    context: DeploymentContext
  ): Promise<void> {
    const startTime = new Date();
    const stopSpinner = this.progress.startSpinner(stage.name);
    this.metrics.startStage(stage.name);

    try {
      await stage.execute(context);

      // Stage completed successfully
      const endTime = new Date();
      this.metrics.endStage(stage.name);
      stopSpinner();

      const duration = this.metrics.getMetrics().stageDurations.get(stage.name);
      const durationStr = duration ? ` (${(duration / 1000).toFixed(1)}s)` : "";
      this.progress.complete(`${stage.name}${durationStr}`);

      // Record successful stage result
      const stageResult = this.resultCollector.createStageResult(
        stage.name,
        'success',
        startTime,
        endTime
      );
      this.resultCollector.addStageResult(stageResult);

      logger.debug(`Stage completed: ${stage.name}`, { duration });

    } catch (error) {
      // Stage failed - collect information and continue
      const endTime = new Date();
      this.metrics.endStage(stage.name);
      stopSpinner();

      const isPartialFailure = this.isPartialFailure(error);
      const status: StageStatus = isPartialFailure ? 'partial' : 'failed';

      // Show appropriate progress indicator
      if (isPartialFailure) {
        this.progress.warn(`${stage.name} - Partial Success`);
      } else {
        this.progress.fail(`${stage.name} - Failed`);
      }

      // Extract entity-level results if available
      const entityResults = extractEntityResults(error);

      // Create stage result with detailed information
      const stageResult = this.resultCollector.createStageResult(
        stage.name,
        status,
        startTime,
        endTime,
        entityResults,
        error instanceof Error ? error.message : String(error)
      );
      this.resultCollector.addStageResult(stageResult);

      logger.error(`Stage ${status}: ${stage.name}`, { 
        error,
        successCount: stageResult.successCount,
        failureCount: stageResult.failureCount
      });

      // Continue to next stage instead of throwing
      // This allows other stages to complete successfully
    }
  }

  private isPartialFailure(error: unknown): boolean {
    // Check if this is a StageAggregateError with some successes
    return error instanceof StageAggregateError && error.successes.length > 0;
  }
}

/**
 * Enhanced deployment execution that provides detailed results
 * and continues processing even when some stages fail
 */
export async function executeEnhancedDeployment(
  stages: DeploymentStage[],
  context: DeploymentContext
): Promise<{ metrics: DeploymentMetrics; result: DeploymentResult; shouldExit: boolean; exitCode: number }> {
  const pipeline = new EnhancedDeploymentPipeline();
  
  // Add all stages to pipeline
  stages.forEach(stage => pipeline.addStage(stage));
  
  // Execute pipeline and collect results
  const { metrics, result } = await pipeline.execute(context);
  
  // Determine exit behavior based on results
  const formatter = new DeploymentResultFormatter();
  const exitCode = formatter.getExitCode(result.overallStatus);
  const shouldExit = result.overallStatus === 'failed';
  
  return { metrics, result, shouldExit, exitCode };
}