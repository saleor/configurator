import { logger } from "../../lib/logger";
import { isTransientError } from "../../lib/utils/error-classification";
import { resilienceTracker } from "../../lib/utils/resilience-tracker";
import { StageAggregateError } from "./errors";
import { MetricsCollector } from "./metrics";
import { ProgressIndicator } from "./progress";
import {
  type DeploymentResult,
  DeploymentResultCollector,
  DeploymentResultFormatter,
  extractEntityResults,
  type StageStatus,
} from "./results";
import type { DeploymentContext, DeploymentMetrics, DeploymentStage } from "./types";

const ABORTED_STAGE_MESSAGE = "Not run: deployment stopped after a rate limit or network error";

export class EnhancedDeploymentPipeline {
  private readonly stages: DeploymentStage[] = [];
  private readonly metrics = new MetricsCollector();
  private readonly resultCollector = new DeploymentResultCollector();

  constructor(private readonly progress: ProgressIndicator = new ProgressIndicator()) {}

  addStage(stage: DeploymentStage): this {
    this.stages.push(stage);
    return this;
  }

  async execute(context: DeploymentContext): Promise<{
    metrics: DeploymentMetrics;
    result: DeploymentResult;
    /** Transient error (rate limit, network) that stopped the pipeline early, if any */
    abortError?: unknown;
  }> {
    logger.info("Starting enhanced deployment pipeline", {
      stageCount: this.stages.length,
    });

    let abortError: unknown;

    for (const stage of this.stages) {
      if (abortError !== undefined) {
        this.handleSkippedStage(stage, ABORTED_STAGE_MESSAGE);
        continue;
      }

      if (stage.skip?.(context)) {
        logger.debug(`Skipping stage: ${stage.name}`);
        this.handleSkippedStage(stage);
        continue;
      }

      try {
        await this.executeStageWithResultCollection(stage, context);
      } catch (error) {
        // Transient errors stop the pipeline; keep what was collected so the caller can
        // still show the summary and save the report before failing.
        abortError = error;
      }
    }

    const metrics = this.metrics.complete();
    const result = this.resultCollector.getResult();

    return { metrics, result, abortError };
  }

  private handleSkippedStage(stage: DeploymentStage, reason?: string): void {
    const stageResult = this.resultCollector.createStageResult(
      stage.name,
      "skipped",
      new Date(),
      new Date(),
      undefined,
      reason
    );
    this.resultCollector.addStageResult(stageResult);
  }

  private async executeStageWithResultCollection(
    stage: DeploymentStage,
    context: DeploymentContext
  ): Promise<void> {
    const startTime = new Date();
    const stopSpinner = this.progress.startSpinner(stage.name);

    try {
      await this.metrics.runStage(stage.name, () => stage.execute(context));

      // Stage completed successfully
      const endTime = new Date();
      stopSpinner();

      const duration = this.metrics.getMetrics().stageDurations.get(stage.name);
      const durationStr = duration ? ` (${(duration / 1000).toFixed(1)}s)` : "";
      this.progress.complete(`${stage.name}${durationStr}`);

      // Record successful stage result
      const stageResult = this.resultCollector.createStageResult(
        stage.name,
        "success",
        startTime,
        endTime
      );
      this.resultCollector.addStageResult(stageResult);

      logger.debug(`Stage completed: ${stage.name}`, { duration });
    } catch (error) {
      // Transient errors (rate limit, network) persisted through client retries: record the
      // stage as failed and stop the pipeline (see execute)
      if (isTransientError(error)) {
        stopSpinner();
        this.progress.fail(`${stage.name} - Failed`);
        this.resultCollector.addStageResult(
          this.resultCollector.createStageResult(
            stage.name,
            "failed",
            startTime,
            new Date(),
            undefined,
            error instanceof Error ? error.message : String(error)
          )
        );
        logger.error(`Stage aborted by transient error: ${stage.name}`, { error });
        throw error;
      }

      // Stage failed - collect information and continue
      const endTime = new Date();
      stopSpinner();

      const isPartialFailure = this.isPartialFailure(error);
      const status: StageStatus = isPartialFailure ? "partial" : "failed";

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
        failureCount: stageResult.failureCount,
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
  context: DeploymentContext,
  progress?: ProgressIndicator
): Promise<{
  metrics: DeploymentMetrics;
  result: DeploymentResult;
  shouldExit: boolean;
  exitCode: number;
  abortError?: unknown;
}> {
  resilienceTracker.reset();

  const pipeline = new EnhancedDeploymentPipeline(progress);
  stages.forEach((stage) => pipeline.addStage(stage));

  const { metrics, result, abortError } = await pipeline.execute(context);

  const formatter = new DeploymentResultFormatter();
  const exitCode = formatter.getExitCode(result.overallStatus);
  const shouldExit = result.overallStatus === "failed";

  return { metrics, result, shouldExit, exitCode, abortError };
}
