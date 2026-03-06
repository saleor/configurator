import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema, shouldOutputJson } from "../cli/command";
import { Console } from "../cli/console";
import { printDuplicateIssues } from "../cli/reporters/duplicates";
import { createConfigurator } from "../core/configurator";
import { EXIT_CODES } from "../core/deployment/errors";
import type { DiffSummary } from "../core/diff";
import { type EntityFilterOptions, filterDiffResults } from "../core/diff/entity-filter";
import {
  classifyChangeSeverity,
  createDetailedFormatter,
  createGitHubCommentFormatter,
} from "../core/diff/formatters";
import { scanForDuplicateIdentifiers } from "../core/validation/preflight";
import { buildEnvelope, outputEnvelope } from "../lib/json-envelope";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";

/**
 * Extended schema for diff command with CI/CD flags
 */
export const diffCommandSchema = baseCommandArgsSchema.extend({
  /** Output diff results in JSON format for machine parsing */
  json: z.boolean().default(false).describe("Output diff results in JSON format"),
  /** Output diff results as GitHub PR comment markdown */
  githubComment: z.boolean().default(false).describe("Output as GitHub PR comment markdown"),
  /** Exit with error code if any deletions detected */
  failOnDelete: z.boolean().default(false).describe("Exit with error if deletions detected"),
  /** Exit with error code if breaking changes detected */
  failOnBreaking: z
    .boolean()
    .default(false)
    .describe("Exit with error if breaking changes detected"),
  /** Write output to file instead of stdout */
  outputFile: z.string().optional().describe("Write output to file"),
  /** Show only summary counts, no details */
  summary: z.boolean().default(false).describe("Show only summary counts"),
  /** Exclude media fields from diff comparison */
  skipMedia: z.boolean().default(false).describe("Exclude media fields from diff comparison"),
  /** Force human-readable output even in non-TTY mode */
  text: z.boolean().default(false).describe("Force human-readable output even in non-TTY mode"),
  /** Filter diff results by entity type */
  entityType: z.string().optional().describe("Filter results by entity type (e.g., Categories)"),
  /** Filter diff results to a specific entity */
  entity: z
    .string()
    .optional()
    .describe("Filter results to a specific entity (e.g., Categories/electronics)"),
});

export type DiffCommandArgs = z.infer<typeof diffCommandSchema>;

class DiffCommandHandler implements CommandHandler<DiffCommandArgs, void> {
  console = new Console();

  private formatDiffSummaryMessage(totalChanges: number): string {
    if (totalChanges === 0) {
      return "\n✅ No differences found - configurations are in sync";
    }

    const changeText = totalChanges === 1 ? "difference" : "differences";
    return `\n⚠️  Found ${totalChanges} ${changeText} that would be applied by 'deploy'`;
  }

  private logDiffCompletion(summary: DiffSummary): void {
    logger.info("Diff process completed successfully", {
      totalChanges: summary.totalChanges,
      creates: summary.creates,
      updates: summary.updates,
      deletes: summary.deletes,
    });
  }

  /**
   * Formats the diff output based on command flags
   */
  private formatOutput(
    summary: DiffSummary,
    defaultOutput: string,
    args: DiffCommandArgs,
    hasEntityFilter: boolean
  ): string {
    // GitHub comment format
    if (args.githubComment) {
      const formatter = createGitHubCommentFormatter({
        saleorUrl: args.url,
        configFile: args.config,
        includeDetails: !args.summary,
      });
      return formatter.format(summary);
    }

    // Re-format when entity filters are active since defaultOutput is unfiltered
    if (hasEntityFilter) {
      return createDetailedFormatter().format(summary);
    }

    // Default format
    return defaultOutput;
  }

  /**
   * Checks for policy violations and returns appropriate exit code
   */
  private checkPolicyViolations(summary: DiffSummary, args: DiffCommandArgs): number {
    // Check for deletions if --fail-on-delete is set
    if (args.failOnDelete && summary.deletes > 0) {
      this.console.error(
        `\n❌ Diff blocked: ${summary.deletes} deletion(s) detected (--fail-on-delete is enabled)`
      );
      return EXIT_CODES.DELETION_BLOCKED;
    }

    // Check for breaking changes if --fail-on-breaking is set
    if (args.failOnBreaking) {
      const hasBreakingChanges =
        summary.deletes > 0 ||
        summary.results.some((r) => classifyChangeSeverity(r) === "critical");

      if (hasBreakingChanges) {
        this.console.error(
          "\n❌ Diff blocked: Breaking changes detected (--fail-on-breaking is enabled)"
        );
        return EXIT_CODES.BREAKING_BLOCKED;
      }
    }

    return EXIT_CODES.SUCCESS;
  }

  /**
   * Writes output to file if --output-file is specified
   */
  private async writeOutputToFile(output: string, filePath: string): Promise<void> {
    try {
      const fs = await import("node:fs/promises");
      await fs.writeFile(filePath, output, "utf-8");
      this.console.muted(`📄 Output written to ${filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write output to file "${filePath}": ${message}`);
    }
  }

  private async performDiffOperation(args: DiffCommandArgs): Promise<void> {
    const useJson = shouldOutputJson(args);
    const configurator = createConfigurator(args);

    try {
      // Skip header for JSON/GitHub output (machine-readable)
      if (!useJson && !args.githubComment) {
        this.console.muted(
          "⏳ Preparing a diff between the configuration and the Saleor instance..."
        );
      }

      // Preflight: surface duplicate identifiers with friendly output and block diff
      try {
        const cfg = await configurator.services.configStorage.load();
        const dupes = scanForDuplicateIdentifiers(cfg);
        if (dupes.length > 0) {
          if (useJson) {
            outputEnvelope(
              buildEnvelope({
                command: "diff",
                exitCode: EXIT_CODES.VALIDATION,
                result: { status: "validation_error" as const },
                errors: dupes.map((d) => ({
                  message: `Duplicate ${d.label} '${d.identifier}' found ${d.count} times in ${d.section}`,
                })),
              })
            );
          } else {
            printDuplicateIssues(dupes, this.console, args.config);
            this.console.cancelled("\nDiff is blocked until duplicates are resolved.");
          }
          process.exit(EXIT_CODES.VALIDATION);
        }
      } catch (e) {
        // Re-throw exit errors (from process.exit mock in tests or real exits)
        if (e instanceof Error && e.message.includes("process.exit")) throw e;
        // If config can't be loaded, allow normal error path to handle
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.warn("Preflight duplicate scan failed", { error: errorMessage });
      }

      const { summary: rawSummary, output: defaultOutput } = await configurator.diff({
        skipMedia: args.skipMedia,
      });

      // Apply entity filter if flags present
      const filterOptions: EntityFilterOptions = {
        entityType: args.entityType,
        entity: args.entity,
      };
      const summary = filterDiffResults(rawSummary, filterOptions);

      // Check policy violations once
      const exitCode = this.checkPolicyViolations(summary, args);

      // JSON envelope output
      if (useJson) {
        const operations = summary.results.map((result) => ({
          entity: result.entityType,
          name: result.entityName,
          action: result.operation.toLowerCase(),
          fields: result.changes?.map((c) => c.field) ?? [],
        }));

        outputEnvelope(
          buildEnvelope({
            command: "diff",
            exitCode,
            result: {
              summary: {
                totalChanges: summary.totalChanges,
                creates: summary.creates,
                updates: summary.updates,
                deletes: summary.deletes,
              },
              operations,
              hasDestructiveOperations: summary.deletes > 0,
            },
          })
        );
        this.logDiffCompletion(summary);
        process.exit(exitCode);
      }

      // Format output based on flags
      const hasEntityFilter = Boolean(args.entityType || args.entity);
      const output = this.formatOutput(summary, defaultOutput, args, hasEntityFilter);

      // Write to file if specified, otherwise print to console
      if (args.outputFile) {
        await this.writeOutputToFile(output, args.outputFile);
      } else {
        if (args.githubComment) {
          console.log(output);
        } else {
          this.console.status(output);
          const summaryMessage = this.formatDiffSummaryMessage(summary.totalChanges);
          this.console.status(summaryMessage);
        }
      }

      this.logDiffCompletion(summary);
      process.exit(exitCode);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("process.exit(")) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Diff failed", { error: errorMessage });

      if (useJson) {
        outputEnvelope(
          buildEnvelope({
            command: "diff",
            exitCode: EXIT_CODES.UNEXPECTED,
            result: { status: "error" as const },
            errors: [{ message: errorMessage }],
          })
        );
      } else {
        this.console.error(`❌ Diff failed: ${errorMessage}`);
      }
      process.exit(EXIT_CODES.UNEXPECTED);
    }
  }

  async execute(args: DiffCommandArgs): Promise<void> {
    // Skip decorative output for machine-readable formats
    const isMachineReadable = shouldOutputJson(args) || args.githubComment;

    this.console.setOptions({ quiet: args.quiet || isMachineReadable });

    if (!isMachineReadable) {
      this.console.header("🔍 Saleor Configuration Diff\n");
      if (args.skipMedia) {
        this.console.muted("📷 Media handling: Excluded from comparison (--skip-media flag)");
      }
    }

    await this.performDiffOperation(args);
  }
}

export async function handleDiff(args: DiffCommandArgs): Promise<void> {
  const handler = new DiffCommandHandler();
  await handler.execute(args);
}

export const diffCommandConfig: CommandConfig<typeof diffCommandSchema> = {
  name: "diff",
  description: "Shows the differences between local and remote Saleor configurations",
  schema: diffCommandSchema,
  handler: handleDiff,
  requiresInteractive: true,
  examples: [
    `${COMMAND_NAME} diff --url https://my-shop.saleor.cloud/graphql/ --token token123`,
    `${COMMAND_NAME} diff --config custom-config.yml`,
    `${COMMAND_NAME} diff --json`,
    `${COMMAND_NAME} diff --github-comment`,
    `${COMMAND_NAME} diff --fail-on-delete`,
    `${COMMAND_NAME} diff --fail-on-breaking`,
    `${COMMAND_NAME} diff --json --output-file diff-results.json`,
    `${COMMAND_NAME} diff --skip-media # Exclude media fields from comparison`,
  ],
};
