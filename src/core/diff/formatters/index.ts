export { BaseDiffFormatter } from "./base-formatter";
export { DeployDiffFormatter } from "./deploy-formatter";
export { DetailedDiffFormatter } from "./detailed-formatter";
export { IntrospectDiffFormatter } from "./introspect-formatter";
export { SummaryDiffFormatter } from "./summary-formatter";
export { JsonDiffFormatter, createJsonFormatter } from "./json-formatter";
export { GitHubCommentFormatter, createGitHubCommentFormatter } from "./github-comment-formatter";

// Re-export CI types for consumers
export type {
  DiffJsonOutput,
  DiffJsonSummary,
  DiffEntityResult,
  EntityTypeChanges,
  FieldChange,
  GitHubActionsOutputs,
  JsonFormatOptions,
  ChangeSeverity,
} from "./ci-types";
export {
  classifyChangeSeverity,
  createGitHubActionsOutputs,
  toDiffEntityResult,
} from "./ci-types";

import { DeployDiffFormatter } from "./deploy-formatter";
import { DetailedDiffFormatter } from "./detailed-formatter";
import { GitHubCommentFormatter } from "./github-comment-formatter";
import { IntrospectDiffFormatter } from "./introspect-formatter";
import { JsonDiffFormatter } from "./json-formatter";
import { SummaryDiffFormatter } from "./summary-formatter";
import type { JsonFormatOptions } from "./ci-types";

// Factory function for creating formatters
export function createDetailedFormatter() {
  return new DetailedDiffFormatter();
}

export function createSummaryFormatter() {
  return new SummaryDiffFormatter();
}

export function createIntrospectFormatter() {
  return new IntrospectDiffFormatter();
}

export function createDeployFormatter() {
  return new DeployDiffFormatter();
}
