export { BaseDiffFormatter } from "./base-formatter";
export { DetailedDiffFormatter } from "./detailed-formatter";
export { IntrospectDiffFormatter } from "./introspect-formatter";
export { SummaryDiffFormatter } from "./summary-formatter";

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
