import type { ModelInput } from "../../../modules/config/schema/schema";
import { entityComparator } from "./entity-comparator";

function normalizeAttributeValue(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return [...value].sort();
  return value;
}

/** Compares models (Saleor pages) by slug. */
export const modelComparator = entityComparator<ModelInput>({
  entityType: "Models",

  identify(model) {
    if (!model.slug) {
      throw new Error("Model/Page must have a valid slug");
    }
    return model.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("title", desired.title, current.title);
    changes.value("content", desired.content || undefined, current.content || undefined, {});
    changes.value("isPublished", desired.isPublished ?? false, current.isPublished ?? false);
    changes.value(
      "publishedAt",
      desired.publishedAt || undefined,
      current.publishedAt || undefined
    );

    const desiredType = desired.modelType;
    const currentType = current.modelType;
    if (desiredType !== currentType) {
      changes.record(["modelType"], { current: currentType || null, desired: desiredType || null });
    }

    const desiredAttributes = desired.attributes ?? {};
    const currentAttributes = current.attributes ?? {};
    const keys = new Set([...Object.keys(desiredAttributes), ...Object.keys(currentAttributes)]);
    for (const key of keys) {
      const desiredValue = normalizeAttributeValue(desiredAttributes[key]);
      const currentValue = normalizeAttributeValue(currentAttributes[key]);
      if (JSON.stringify(desiredValue) !== JSON.stringify(currentValue)) {
        changes.record(["attributes", key], {
          current: currentValue,
          desired: desiredValue,
        });
      }
    }
  },
});
