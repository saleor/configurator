import type { ModelInput } from "../../../modules/config/schema/schema";
import type { Page } from "../../../modules/model/repository";
import type { DiffChange, DiffResult, EntityType } from "../types";
import { BaseEntityComparator, type ComparatorOptions } from "./base-comparator";

export class ModelComparator extends BaseEntityComparator<
  readonly ModelInput[],
  readonly Page[],
  ModelInput | Page
> {
  protected readonly entityType: EntityType = "Models";

  compare(local: readonly ModelInput[], remote: readonly Page[]): readonly DiffResult[] {
    // Validate and deduplicate local models
    this.validateUniqueIdentifiers(local);
    const deduplicatedLocal = this.deduplicateEntities(local);

    const results: DiffResult[] = [];
    const localMap = this.createEntityMap(deduplicatedLocal);
    const remoteMap = this.createEntityMap(remote);

    // Check for models to create or update
    for (const localModel of deduplicatedLocal) {
      const remoteModel = remoteMap.get(this.getEntityName(localModel));

      if (!remoteModel) {
        // Model doesn't exist in remote, create it
        results.push(this.createCreateResult(localModel));
      } else {
        // Model exists, check for updates
        const changes = this.compareEntityFields(localModel, remoteModel);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localModel, remoteModel, changes));
        }
      }
    }

    // Check for models to delete (exists in remote but not in local)
    for (const remoteModel of remote) {
      if (!localMap.has(this.getEntityName(remoteModel))) {
        results.push(this.createDeleteResult(remoteModel));
      }
    }

    return results;
  }

  protected getEntityName(entity: ModelInput | Page): string {
    if (!entity.slug) {
      throw new Error("Model/Page must have a valid slug");
    }
    return entity.slug;
  }

  private normalizeAttributeValue(value: unknown): unknown {
    // Handle different attribute value types
    if (value === null || value === undefined) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.sort();
    }
    return value;
  }

  private getAttributes(entity: ModelInput | Page): Record<string, unknown> {
    if ("attributes" in entity && entity.attributes) {
      // For local input, attributes are already a key-value record
      return entity.attributes as Record<string, unknown>;
    }

    // For remote page, extract attributes from the structure
    const page = entity as Page;
    const attributes: Record<string, unknown> = {};

    if (page.attributes) {
      for (const attr of page.attributes) {
        const slug = attr.attribute.slug;
        if (slug) {
          // Extract values based on attribute type
          if (attr.values && attr.values.length > 0) {
            // Multi-value attribute
            attributes[slug] = attr.values
              .map(
                (v) =>
                  v.name || v.slug || v.value || v.plainText || v.boolean || v.date || v.dateTime
              )
              .filter(
                (value): value is string | number | boolean => value !== null && value !== undefined
              );
          }
        }
      }
    }

    return attributes;
  }

  private getPageTypeName(entity: ModelInput | Page): string | undefined {
    if ("modelType" in entity) {
      // Local input references modelType
      return entity.modelType;
    }

    // Remote page has pageType
    const page = entity as Page;
    return page.pageType?.name;
  }

  protected compareEntityFields(
    local: ModelInput | Page,
    remote: ModelInput | Page,
    _options?: ComparatorOptions
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare title
    if (local.title !== remote.title) {
      changes.push(this.createFieldChange("title", remote.title, local.title));
    }

    // Compare content
    const localContent = local.content || undefined;
    const remoteContent = remote.content || undefined;
    if (localContent !== remoteContent) {
      changes.push(
        this.createFieldChange("content", remoteContent, localContent, "Content changed")
      );
    }

    // Compare isPublished
    const localIsPublished = local.isPublished ?? false;
    const remoteIsPublished = remote.isPublished ?? false;
    if (localIsPublished !== remoteIsPublished) {
      changes.push(this.createFieldChange("isPublished", remoteIsPublished, localIsPublished));
    }

    // Compare publishedAt
    const localPublishedAt = local.publishedAt || undefined;
    const remotePublishedAt = remote.publishedAt || undefined;
    if (localPublishedAt !== remotePublishedAt) {
      changes.push(this.createFieldChange("publishedAt", remotePublishedAt, localPublishedAt));
    }

    // Compare model/page type
    const localType = this.getPageTypeName(local);
    const remoteType = this.getPageTypeName(remote);
    if (localType !== remoteType) {
      changes.push(this.createFieldChange("modelType", remoteType || null, localType || null));
    }

    // Compare attributes
    const localAttributes = this.getAttributes(local);
    const remoteAttributes = this.getAttributes(remote);

    // Get all unique attribute keys
    const allKeys = new Set([...Object.keys(localAttributes), ...Object.keys(remoteAttributes)]);

    for (const key of allKeys) {
      const localValue = this.normalizeAttributeValue(localAttributes[key]);
      const remoteValue = this.normalizeAttributeValue(remoteAttributes[key]);

      const localStr = JSON.stringify(localValue);
      const remoteStr = JSON.stringify(remoteValue);

      if (localStr !== remoteStr) {
        const formatValue = (val: unknown) => {
          if (val === undefined) return "not set";
          if (Array.isArray(val)) return `[${val.join(", ")}]`;
          return String(val);
        };

        changes.push(
          this.createFieldChange(
            `attributes.${key}`,
            remoteValue,
            localValue,
            `Attribute "${key}": ${formatValue(remoteValue)} → ${formatValue(localValue)}`
          )
        );
      }
    }

    return changes;
  }
}
