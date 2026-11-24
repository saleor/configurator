import { logger } from "../../../lib/logger";
import { EntityValidationError } from "../errors";
import type { DiffResult, EntityType } from "../types";
import { ChangeSet, type ComparatorOptions } from "./change-set";

/** Compares one config section with what Saleor holds. */
export interface EntityComparator {
  compare(desired: unknown, current: unknown, options?: ComparatorOptions): readonly DiffResult[];
}

/**
 * How one entity type is diffed. The comparator built from it owns matching, duplicates and
 * result order; the spec only says how entities are identified and how two of them differ.
 */
export interface EntitySpec<T> {
  readonly entityType: EntityType;
  /** The identifier deploy uses to find the entity in Saleor (a slug, or a name). */
  identify(entity: T): string;
  /** Records how `desired` (the config) differs from `current` (Saleor). */
  compareFields(changes: ChangeSet, desired: T, current: T): void;
  /** Records details worth showing for an entity that will be created. */
  describeCreate?(changes: ChangeSet, desired: T): void;
}

/**
 * Builds a comparator from a spec. Entities are matched by identifier: config-only ones are
 * created, Saleor-only ones are reported, and matched ones are updated when a field differs.
 * Duplicate identifiers in the config are an error; in Saleor the first one wins.
 */
export function entityComparator<T>(spec: EntitySpec<T>): EntityComparator {
  return {
    compare(desiredSection, currentSection, options = {}) {
      const desired = asList<T>(desiredSection);
      const current = firstOfEach(spec, asList<T>(currentSection));
      rejectDuplicates(spec, desired);

      const currentById = new Map(current.map((entity) => [spec.identify(entity), entity]));
      const desiredIds = new Set(desired.map((entity) => spec.identify(entity)));
      const results: DiffResult[] = [];

      for (const entity of desired) {
        const entityName = spec.identify(entity);
        const existing = currentById.get(entityName);
        const changes = ChangeSet.create(options);

        if (existing === undefined) {
          spec.describeCreate?.(changes, entity);
          results.push({
            operation: "CREATE",
            entityType: spec.entityType,
            entityName,
            desired: entity as Record<string, unknown>,
            ...(changes.changes().length > 0 ? { changes: changes.changes() } : {}),
          });
          continue;
        }

        spec.compareFields(changes, entity, existing);
        if (changes.changes().length > 0) {
          results.push({
            operation: "UPDATE",
            entityType: spec.entityType,
            entityName,
            current: existing as Record<string, unknown>,
            desired: entity as Record<string, unknown>,
            changes: changes.changes(),
          });
        }
      }

      for (const entity of current) {
        const entityName = spec.identify(entity);
        if (!desiredIds.has(entityName)) {
          results.push({
            operation: "DELETE",
            entityType: spec.entityType,
            entityName,
            current: entity as Record<string, unknown>,
          });
        }
      }

      return results;
    },
  };
}

function asList<T>(section: unknown): readonly T[] {
  return Array.isArray(section) ? (section as T[]) : [];
}

function rejectDuplicates<T>(spec: EntitySpec<T>, entities: readonly T[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entity of entities) {
    const id = spec.identify(entity);
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size > 0) {
    throw new EntityValidationError(
      `Duplicate entity identifiers found in ${spec.entityType}: ${[...duplicates].join(", ")}`
    );
  }
}

function firstOfEach<T>(spec: EntitySpec<T>, entities: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const kept = entities.filter((entity) => {
    const id = spec.identify(entity);
    if (seen.has(id)) {
      duplicates.add(id);
      return false;
    }
    seen.add(id);
    return true;
  });
  if (duplicates.size > 0) {
    logger.warn(
      `Duplicate ${spec.entityType} detected: ${[...duplicates].join(", ")}. Using first occurrence only.`
    );
  }
  return kept;
}
