import type { ModelInput } from "../../../modules/config/schema/schema";
import type { Page } from "../../../modules/model/repository";
import { entityComparator } from "./entity-comparator";

type ModelEntity = ModelInput | Page;

function normalizeAttributeValue(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return [...value].sort();
  return value;
}

function attributesOf(entity: ModelEntity): Record<string, unknown> {
  if ("attributes" in entity && entity.attributes) {
    // Local input: attributes are already a key-value record.
    return entity.attributes as Record<string, unknown>;
  }

  // Remote page: extract values from the attribute structure.
  const page = entity as Page;
  const attributes: Record<string, unknown> = {};
  for (const attr of page.attributes ?? []) {
    const slug = attr.attribute.slug;
    if (slug && attr.values && attr.values.length > 0) {
      attributes[slug] = attr.values
        .map((v) => v.name || v.slug || v.value || v.plainText || v.boolean || v.date || v.dateTime)
        .filter(
          (value): value is string | number | boolean => value !== null && value !== undefined
        );
    }
  }
  return attributes;
}

function modelTypeName(entity: ModelEntity): string | undefined {
  if ("modelType" in entity) return entity.modelType;
  return (entity as Page).pageType?.name;
}

function describeAttributeValue(value: unknown): string {
  if (value === undefined) return "not set";
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

/** Compares models (Saleor pages) by slug. */
export const modelComparator = entityComparator<ModelEntity>({
  entityType: "Models",

  identify(model) {
    if (!model.slug) {
      throw new Error("Model/Page must have a valid slug");
    }
    return model.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("title", desired.title, current.title);
    changes.value("content", desired.content || undefined, current.content || undefined, {
      description: "Content changed",
    });
    changes.value("isPublished", desired.isPublished ?? false, current.isPublished ?? false);
    changes.value(
      "publishedAt",
      desired.publishedAt || undefined,
      current.publishedAt || undefined
    );

    const desiredType = modelTypeName(desired);
    const currentType = modelTypeName(current);
    if (desiredType !== currentType) {
      changes.record(["modelType"], { current: currentType || null, desired: desiredType || null });
    }

    const desiredAttributes = attributesOf(desired);
    const currentAttributes = attributesOf(current);
    const keys = new Set([...Object.keys(desiredAttributes), ...Object.keys(currentAttributes)]);
    for (const key of keys) {
      const desiredValue = normalizeAttributeValue(desiredAttributes[key]);
      const currentValue = normalizeAttributeValue(currentAttributes[key]);
      if (JSON.stringify(desiredValue) !== JSON.stringify(currentValue)) {
        changes.record(["attributes", key], {
          current: currentValue,
          desired: desiredValue,
          description: `Attribute "${key}": ${describeAttributeValue(currentValue)} → ${describeAttributeValue(desiredValue)}`,
        });
      }
    }
  },
});
