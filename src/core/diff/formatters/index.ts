export { BaseDiffFormatter } from "./base-formatter";
export { DetailedDiffFormatter } from "./detailed-formatter";
export { SummaryDiffFormatter } from "./summary-formatter";
export { IntrospectDiffFormatter } from "./introspect-formatter";

import { DetailedDiffFormatter } from "./detailed-formatter";
import { SummaryDiffFormatter } from "./summary-formatter";
import { IntrospectDiffFormatter } from "./introspect-formatter";

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
