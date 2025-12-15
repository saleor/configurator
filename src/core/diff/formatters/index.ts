export { BaseDiffFormatter } from "./base-formatter";
// Re-export CI types for consumers
export type {
  ChangeSeverity,
  DiffEntityResult,
  DiffJsonOutput,
  DiffJsonSummary,
  EntityTypeChanges,
  FieldChange,
  GitHubActionsOutputs,
  JsonFormatOptions,
} from "./ci-types";
export {
  classifyChangeSeverity,
  createGitHubActionsOutputs,
  toDiffEntityResult,
} from "./ci-types";
export { DeployDiffFormatter } from "./deploy-formatter";
export { DetailedDiffFormatter } from "./detailed-formatter";
export { createGitHubCommentFormatter, GitHubCommentFormatter } from "./github-comment-formatter";
export { IntrospectDiffFormatter } from "./introspect-formatter";
export { createJsonFormatter, JsonDiffFormatter } from "./json-formatter";
export { SummaryDiffFormatter } from "./summary-formatter";

import { DeployDiffFormatter } from "./deploy-formatter";
import { DetailedDiffFormatter } from "./detailed-formatter";
import { IntrospectDiffFormatter } from "./introspect-formatter";
import { SummaryDiffFormatter } from "./summary-formatter";

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
