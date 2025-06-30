export { BaseDiffFormatter } from "./base-formatter";
export { DetailedDiffFormatter } from "./detailed-formatter";
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
