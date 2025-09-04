/**
 * Enhanced deployment result reporting
 * Handles partial successes and provides clear user feedback
 */

export type StageStatus = 'success' | 'partial' | 'failed' | 'skipped';

export interface EntityResult {
  readonly name: string;
  readonly operation: 'create' | 'update' | 'delete';
  readonly success: boolean;
  readonly error?: string;
  readonly suggestions?: readonly string[];
}

export interface StageResult {
  readonly name: string;
  readonly status: StageStatus;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly duration?: number;
  readonly entities?: readonly EntityResult[];
  readonly error?: string;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalCount: number;
}

export interface DeploymentResult {
  readonly overallStatus: 'success' | 'partial' | 'failed';
  readonly startTime: Date;
  readonly endTime: Date;
  readonly totalDuration: number;
  readonly stages: readonly StageResult[];
  readonly summary: {
    readonly totalEntities: number;
    readonly successfulEntities: number;
    readonly failedEntities: number;
    readonly skippedStages: number;
    readonly completedStages: number;
    readonly failedStages: number;
  };
}

export class DeploymentResultCollector {
  private stages: StageResult[] = [];
  private readonly startTime = new Date();

  addStageResult(result: StageResult): void {
    this.stages.push(result);
  }

  createStageResult(
    name: string,
    status: StageStatus,
    startTime: Date,
    endTime?: Date,
    entities?: readonly EntityResult[],
    error?: string
  ): StageResult {
    const successCount = entities?.filter(e => e.success).length ?? 0;
    const failureCount = entities?.filter(e => !e.success).length ?? 0;
    const totalCount = entities?.length ?? 0;

    return {
      name,
      status,
      startTime,
      endTime,
      duration: endTime ? endTime.getTime() - startTime.getTime() : undefined,
      entities,
      error,
      successCount,
      failureCount,
      totalCount,
    };
  }

  getResult(): DeploymentResult {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    // Calculate overall status
    const failedStages = this.stages.filter(s => s.status === 'failed').length;
    const partialStages = this.stages.filter(s => s.status === 'partial').length;
    const successStages = this.stages.filter(s => s.status === 'success').length;
    const skippedStages = this.stages.filter(s => s.status === 'skipped').length;

    let overallStatus: 'success' | 'partial' | 'failed';
    if (failedStages > 0 && successStages === 0) {
      overallStatus = 'failed';
    } else if (failedStages > 0 || partialStages > 0) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'success';
    }

    // Calculate entity counts
    const totalEntities = this.stages.reduce((sum, stage) => sum + stage.totalCount, 0);
    const successfulEntities = this.stages.reduce((sum, stage) => sum + stage.successCount, 0);
    const failedEntities = this.stages.reduce((sum, stage) => sum + stage.failureCount, 0);

    return {
      overallStatus,
      startTime: this.startTime,
      endTime,
      totalDuration,
      stages: this.stages,
      summary: {
        totalEntities,
        successfulEntities,
        failedEntities,
        skippedStages,
        completedStages: successStages + partialStages,
        failedStages,
      },
    };
  }
}

export class DeploymentResultFormatter {
  format(result: DeploymentResult): string {
    const lines: string[] = [];

    // Overall status header
    const statusIcon = this.getStatusIcon(result.overallStatus);
    const statusText = this.getStatusText(result.overallStatus);
    
    lines.push(`${statusIcon} Deployment ${statusText}`);
    lines.push('');

    // Summary section
    if (result.summary.totalEntities > 0) {
      lines.push('📊 Summary:');
      
      if (result.summary.successfulEntities > 0) {
        lines.push(`  ✅ ${result.summary.successfulEntities} entities deployed successfully`);
      }
      
      if (result.summary.failedEntities > 0) {
        lines.push(`  ❌ ${result.summary.failedEntities} entities failed to deploy`);
      }
      
      if (result.summary.skippedStages > 0) {
        lines.push(`  ⏭️  ${result.summary.skippedStages} stages skipped (no changes detected)`);
      }
      
      lines.push('');
    }

    // Stage details
    const processedStages = result.stages.filter(s => s.status !== 'skipped');
    if (processedStages.length > 0) {
      lines.push('📋 Stage Results:');
      
      for (const stage of processedStages) {
        const stageIcon = this.getStatusIcon(stage.status);
        const durationText = stage.duration ? ` (${(stage.duration / 1000).toFixed(1)}s)` : '';
        
        lines.push(`  ${stageIcon} ${stage.name}${durationText}`);
        
        if (stage.entities && stage.entities.length > 0) {
          // Group entities by success/failure
          const successful = stage.entities.filter(e => e.success);
          const failed = stage.entities.filter(e => !e.success);
          
          if (successful.length > 0) {
            successful.forEach(entity => {
              lines.push(`    ✅ ${entity.operation.toUpperCase()}: ${entity.name}`);
            });
          }
          
          if (failed.length > 0) {
            failed.forEach(entity => {
              lines.push(`    ❌ ${entity.operation.toUpperCase()}: ${entity.name}`);
              if (entity.error) {
                lines.push(`       Error: ${entity.error}`);
              }
              if (entity.suggestions) {
                entity.suggestions.forEach(suggestion => {
                  lines.push(`       💡 ${suggestion}`);
                });
              }
            });
          }
        } else if (stage.error) {
          lines.push(`    Error: ${stage.error}`);
        }
        
        lines.push('');
      }
    }

    // Skipped stages summary
    const skippedStages = result.stages.filter(s => s.status === 'skipped');
    if (skippedStages.length > 0) {
      lines.push('⏭️  Skipped Stages (no changes detected):');
      skippedStages.forEach(stage => {
        lines.push(`  • ${stage.name}`);
      });
      lines.push('');
    }

    // Final guidance based on result
    if (result.overallStatus === 'partial') {
      lines.push('💡 Next Steps:');
      lines.push('  • Review the failed items above');
      lines.push('  • Fix the issues and run deploy again');
      lines.push('  • Use --include flag to deploy only specific entities');
      lines.push('  • Run diff command to verify current state');
    } else if (result.overallStatus === 'success') {
      lines.push('🎉 All changes deployed successfully!');
    }

    return lines.join('\n');
  }

  private getStatusIcon(status: StageStatus | 'success' | 'partial' | 'failed'): string {
    switch (status) {
      case 'success': return '✅';
      case 'partial': return '⚠️ ';
      case 'failed': return '❌';
      case 'skipped': return '⏭️ ';
      default: return '❓';
    }
  }

  private getStatusText(status: 'success' | 'partial' | 'failed'): string {
    switch (status) {
      case 'success': return 'Completed Successfully';
      case 'partial': return 'Partially Completed';
      case 'failed': return 'Failed';
      default: return 'Unknown Status';
    }
  }

  getExitCode(status: 'success' | 'partial' | 'failed'): number {
    switch (status) {
      case 'success': return 0;
      case 'partial': return 5; // PARTIAL_FAILURE
      case 'failed': return 1;  // UNEXPECTED
      default: return 1;
    }
  }
}

/**
 * Helper to extract entity results from stage errors
 */
export function extractEntityResults(error: unknown): EntityResult[] {
  // Handle StageAggregateError which has structured failure info
  if (error && typeof error === 'object' && 'failures' in error && 'successes' in error) {
    const stageError = error as { failures: Array<{ entity: string; error: Error }>; successes: string[] };
    
    const results: EntityResult[] = [];
    
    // Add successful entities
    stageError.successes.forEach(name => {
      results.push({
        name,
        operation: 'create', // Default, could be enhanced to track actual operation
        success: true,
      });
    });
    
    // Add failed entities
    stageError.failures.forEach(({ entity, error: entityError }) => {
      results.push({
        name: entity,
        operation: 'create', // Default, could be enhanced to track actual operation  
        success: false,
        error: entityError.message,
        suggestions: extractSuggestions(entityError.message),
      });
    });
    
    return results;
  }
  
  return [];
}

function extractSuggestions(errorMessage: string): string[] {
  const suggestions: string[] = [];
  
  if (errorMessage.includes('Category') && errorMessage.includes('not found')) {
    suggestions.push('Verify the category exists in your categories configuration');
    suggestions.push('Check category slug spelling and ensure it matches exactly');
    suggestions.push('Run introspect command to see available categories');
  }
  
  if (errorMessage.includes('ProductType') && errorMessage.includes('not found')) {
    suggestions.push('Verify the product type exists in your productTypes configuration');
    suggestions.push('Check product type name spelling and ensure it matches exactly');
  }
  
  if (errorMessage.includes('Channel') && errorMessage.includes('not found')) {
    suggestions.push('Verify the channel exists in your channels configuration');  
    suggestions.push('Check channel slug spelling and ensure it matches exactly');
  }
  
  return suggestions;
}