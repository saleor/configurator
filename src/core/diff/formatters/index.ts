export { classifyChangeSeverity } from "./ci-types";
export { DeployDiffFormatter } from "./deploy-formatter";
export { DetailedDiffFormatter } from "./detailed-formatter";
export { createGitHubCommentFormatter } from "./github-comment-formatter";
export { IntrospectDiffFormatter } from "./introspect-formatter";
export { SummaryDiffFormatter } from "./summary-formatter";

import { DetailedDiffFormatter } from "./detailed-formatter";
import { SummaryDiffFormatter } from "./summary-formatter";

// Factory function for creating formatters
export function createDetailedFormatter() {
  return new DetailedDiffFormatter();
}

export function createSummaryFormatter() {
  return new SummaryDiffFormatter();
}
