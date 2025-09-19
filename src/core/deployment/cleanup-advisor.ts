import type { SaleorConfig } from "../../modules/config/schema/schema";
import type { DiffSummary } from "../diff";

export interface CleanupSuggestion {
  type: "duplicate-variant-sku" | "default-channel-delete";
  message: string;
}

/**
 * Analyzes the deployed configuration and diff summary to produce actionable
 * post‑deploy cleanup suggestions (SRP: analysis only, no I/O).
 */
export function analyzeDeploymentCleanup(
  config: SaleorConfig,
  summary: DiffSummary
): CleanupSuggestion[] {
  const suggestions: CleanupSuggestion[] = [];

  // 1) Duplicate variant SKUs within a product
  for (const product of config.products || []) {
    const skuCounts = new Map<string, number>();
    for (const v of product.variants || []) {
      const count = skuCounts.get(v.sku) || 0;
      skuCounts.set(v.sku, count + 1);
    }
    for (const [sku, count] of skuCounts.entries()) {
      if (count > 1) {
        suggestions.push({
          type: "duplicate-variant-sku",
          message: `Product "${product.slug}": ${count} variants share SKU "${sku}" → keep a single entry (prefer the one with channelListings)`,
        });
      }
    }
  }

  // 2) default-channel delete noise (system channel)
  const defaultChannelDelete = summary.results.some(
    (r) =>
      r.entityType === "Channels" && r.operation === "DELETE" && r.entityName === "default-channel"
  );
  if (defaultChannelDelete) {
    suggestions.push({
      type: "default-channel-delete",
      message:
        "'default-channel' appears as a deletion; add a stub in config to silence (slug: default-channel, isActive: false)",
    });
  }

  return suggestions;
}
